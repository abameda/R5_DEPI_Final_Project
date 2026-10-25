"""The global filter set shared by every analytical endpoint.

Filters arrive as query parameters (`?country=Egypt&country=Qatar&role=...`)
or, for the comparison studio, as JSON bodies. Every value is validated and
every SQL fragment is parameterized: user text never becomes SQL text.
"""
from __future__ import annotations

import datetime as dt
import json
from typing import Annotated, Literal

from fastapi import HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .db import Store

Text = Annotated[str, Field(min_length=1, max_length=120)]
ListOf = Annotated[list[Text], Field(default_factory=list, max_length=60)]

# filter field -> (jobs column, domain name used for validation or None = free text)
LIST_FIELDS: dict[str, tuple[str, str | None]] = {
    "country": ("country", None),
    "region": ("region", "region"),
    "market": ("market_type", "market_type"),
    "role": ("role_category", "role_category"),
    "seniority": ("seniority", "seniority"),
    "job_type": ("job_type", "job_type"),
    "work_mode": ("work_mode", "work_mode"),
    "source": ("source_dataset", "source_dataset"),
    "cohort": ("cohort", "cohort"),
    "company": ("company", None),
}


class Filters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    country: ListOf
    region: ListOf
    market: ListOf
    role: ListOf
    seniority: ListOf
    job_type: ListOf
    work_mode: ListOf
    source: ListOf
    cohort: ListOf
    company: ListOf
    skill: Annotated[list[Text], Field(default_factory=list, max_length=12)]  # postings must have ALL
    q: Annotated[str | None, Field(default=None, max_length=120)]
    date_from: dt.date | None = None
    date_to: dt.date | None = None
    salary: Literal["any", "advertised"] = "any"
    # 'observed' = only skills written in the posting data as collected; the
    # skill filter and every skill metric then ignore team-added skills.
    provenance: Literal["all", "observed"] = "all"

    @field_validator("q")
    @classmethod
    def _strip(cls, v):
        v = (v or "").strip()
        return v or None

    # ------------------------------------------------------------------
    def validate_domains(self, store: Store) -> "Filters":
        for field, (_, domain) in LIST_FIELDS.items():
            if domain is None:
                continue
            bad = [v for v in getattr(self, field) if v not in store.domains[domain]]
            if bad:
                raise HTTPException(422, f"Unknown {field} value(s): {bad[:5]}")
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise HTTPException(422, "date_from must be on or before date_to")
        return self

    def active(self) -> dict:
        """Only the filters that differ from the defaults (for display/provenance)."""
        return self.model_dump(mode="json", exclude_defaults=True)

    def key(self) -> str:
        return json.dumps(self.model_dump(mode="json"), sort_keys=True)

    def without(self, *fields: str) -> "Filters":
        """Copy with some filters reset, e.g. to compute a chart's own breakdown."""
        return self.model_copy(update={f: type(self).model_fields[f].get_default(call_default_factory=True)
                                       for f in fields})

    # ------------------------------------------------------------------
    def where(self, alias: str = "j") -> tuple[str, list]:
        """SQL condition over the `jobs` table (aliased) + its parameters."""
        a = f"{alias}." if alias else ""
        clauses, params = ["TRUE"], []
        for field, (column, _) in LIST_FIELDS.items():
            values = getattr(self, field)
            if values:
                clauses.append(f"{a}{column} IN ({', '.join('?' * len(values))})")
                params += values
        if self.q:
            like = "%" + self.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            clauses.append(f"({a}title ILIKE ? ESCAPE '\\' OR {a}company ILIKE ? ESCAPE '\\')")
            params += [like, like]
        if self.date_from:
            clauses.append(f"{a}posted_date >= ?")
            params.append(self.date_from)
        if self.date_to:
            clauses.append(f"{a}posted_date <= ?")
            params.append(self.date_to)
        if self.salary == "advertised":
            clauses.append(f"{a}salary_kind = 'advertised'")
        if self.skill:
            obs = " AND is_observed" if self.provenance == "observed" else ""
            clauses.append(
                f"{a}jid IN (SELECT jid FROM job_skills WHERE skill IN ({', '.join('?' * len(self.skill))}){obs} "
                f"GROUP BY jid HAVING count(DISTINCT skill) = ?)")
            params += [*self.skill, len(set(self.skill))]
        return " AND ".join(clauses), params

    def skill_condition(self, alias: str = "s") -> str:
        """Extra condition on job_skills rows for skill metrics."""
        return f" AND {alias}.is_observed" if self.provenance == "observed" else ""

    def cte(self) -> tuple[str, list]:
        """`WITH f AS (filtered jobs)` prefix used by most queries."""
        where, params = self.where("j")
        return f"WITH f AS (SELECT j.* FROM jobs j WHERE {where})", params


def filters_from_query(
    country: Annotated[list[str], Query()] = [],  # noqa: B006 - FastAPI copies defaults
    region: Annotated[list[str], Query()] = [],  # noqa: B006
    market: Annotated[list[str], Query()] = [],  # noqa: B006
    role: Annotated[list[str], Query()] = [],  # noqa: B006
    seniority: Annotated[list[str], Query()] = [],  # noqa: B006
    job_type: Annotated[list[str], Query()] = [],  # noqa: B006
    work_mode: Annotated[list[str], Query()] = [],  # noqa: B006
    source: Annotated[list[str], Query()] = [],  # noqa: B006
    cohort: Annotated[list[str], Query()] = [],  # noqa: B006
    company: Annotated[list[str], Query()] = [],  # noqa: B006
    skill: Annotated[list[str], Query()] = [],  # noqa: B006
    q: str | None = None,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    salary: Literal["any", "advertised"] = "any",
    provenance: Literal["all", "observed"] = "all",
) -> Filters:
    from pydantic import ValidationError

    from .db import get_store
    try:
        f = Filters(country=country, region=region, market=market, role=role, seniority=seniority,
                    job_type=job_type, work_mode=work_mode, source=source, cohort=cohort, company=company,
                    skill=skill, q=q, date_from=date_from, date_to=date_to, salary=salary,
                    provenance=provenance)
    except ValidationError as e:
        raise HTTPException(422, e.errors(include_url=False, include_context=False)) from None
    return f.validate_domains(get_store())
