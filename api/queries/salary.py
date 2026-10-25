"""Salary intelligence.

`advertised` = the pay written in the posting (or the source dataset's own
salary field). `benchmark` = a market figure the team attached afterwards
(Paylab, Indeed, BLS ...). The two are never combined: every endpoint takes
one `kind` and reports it back.

All amounts are annualized USD from `salary_usd_annual`: the midpoint of the
advertised range x periods per year (hour 2080, day 260, week 52, month 12)
x a FIXED approximate exchange rate (clean_utils.USD_PER_UNIT). They are
comparable in order of magnitude, not exact historical conversions.
"""
from __future__ import annotations

from typing import Literal

from fastapi import HTTPException

from ..db import Store
from ..filters import Filters
from ..labels import MIN_SALARY_N, salary_confidence, share
from .market import BREAKDOWN_DIMS

Kind = Literal["advertised", "benchmark"]
PERIODS = ["year", "month", "hour", "day", "week"]


def _period_clause(periods: list[str] | None) -> tuple[str, list]:
    if not periods:
        return "", []
    bad = [p for p in periods if p not in PERIODS]
    if bad:
        raise HTTPException(422, f"Unknown salary period(s): {bad}")
    return f" AND salary_period IN ({', '.join('?' * len(periods))})", list(periods)


def coverage(store: Store, f: Filters, periods: list[str] | None = None) -> dict:
    cte, params = f.cte()
    pc, pp = _period_clause(periods)
    head = store.one(f"""{cte}
        SELECT count(*) AS postings,
               count(*) FILTER (WHERE salary_kind = 'advertised') AS advertised,
               count(*) FILTER (WHERE salary_kind = 'benchmark') AS benchmark,
               count(*) FILTER (WHERE salary_kind = 'advertised_unusable') AS advertised_unusable,
               count(*) FILTER (WHERE salary_kind = 'benchmark_unusable') AS benchmark_unusable
        FROM f""", params)
    currencies = store.rows(f"""{cte}
        SELECT salary_kind AS kind, salary_currency AS currency, count(*) AS n FROM f
        WHERE salary_kind IN ('advertised', 'benchmark') {pc} GROUP BY ALL ORDER BY n DESC""", [*params, *pp])
    periods_mix = store.rows(f"""{cte}
        SELECT salary_kind AS kind, salary_period AS period, count(*) AS n FROM f
        WHERE salary_kind IN ('advertised', 'benchmark') GROUP BY ALL ORDER BY n DESC""", params)
    by_source = store.rows(f"""{cte}
        SELECT source_dataset AS source, count(*) AS postings,
               count(*) FILTER (WHERE salary_kind = 'advertised') AS advertised,
               count(*) FILTER (WHERE salary_kind = 'benchmark') AS benchmark
        FROM f GROUP BY 1 ORDER BY postings DESC""", params)
    head["advertised_share"] = share(head["advertised"], head["postings"])
    return {**head, "currencies": currencies, "periods": periods_mix, "by_source": by_source}


def salary_summary(store: Store, f: Filters, dim: str | None, kind: Kind, periods: list[str] | None,
                   limit: int = 20) -> dict:
    """Quantiles of annualized USD salary, overall and per group of `dim`."""
    cte, params = f.cte()
    pc, pp = _period_clause(periods)
    stats = """count(*) AS n, min(salary_usd_annual) AS min, max(salary_usd_annual) AS max,
               quantile_cont(salary_usd_annual, 0.10) AS p10, quantile_cont(salary_usd_annual, 0.25) AS p25,
               median(salary_usd_annual) AS median, quantile_cont(salary_usd_annual, 0.75) AS p75,
               quantile_cont(salary_usd_annual, 0.90) AS p90, avg(salary_usd_annual) AS mean,
               count(DISTINCT salary_currency) AS currencies"""
    base = f"salary_kind = ? {pc}"
    overall = store.one(f"{cte} SELECT {stats} FROM f WHERE {base}", [*params, kind, *pp])
    groups: list[dict] = []
    if dim == "skill":
        cond = f.skill_condition()
        groups = store.rows(f"""{cte},
            top AS (SELECT s.skill FROM job_skills s JOIN f USING (jid) WHERE f.salary_kind = ? {pc} {cond}
                    GROUP BY 1 ORDER BY count(*) DESC LIMIT ?)
            SELECT s.skill AS key, {stats} FROM job_skills s JOIN f USING (jid)
            WHERE s.skill IN (SELECT skill FROM top) AND f.salary_kind = ? {pc} {cond}
            GROUP BY 1 ORDER BY median DESC""", [*params, kind, *pp, limit, kind, *pp])
    elif dim:
        if dim not in BREAKDOWN_DIMS:
            raise HTTPException(422, f"Unsupported dimension: {dim}")
        groups = store.rows(f"""{cte}
            SELECT {dim} AS key, {stats} FROM f WHERE {base} AND {dim} IS NOT NULL
            GROUP BY 1 HAVING count(*) >= ? ORDER BY n DESC LIMIT ?""",
                            [*params, kind, *pp, MIN_SALARY_N, limit])
        groups.sort(key=lambda g: -(g["median"] or 0))
    for g in [overall, *groups]:
        g["confidence"] = salary_confidence(g.get("n") or 0)
    hidden = 0
    if dim and dim != "skill":
        hidden = store.scalar(f"""{cte} SELECT count(*) FROM (SELECT {dim} FROM f WHERE {base} AND {dim} IS NOT NULL
            GROUP BY 1 HAVING count(*) < ?)""", [*params, kind, *pp, MIN_SALARY_N]) or 0
    return {"kind": kind, "dimension": dim, "periods": periods or [], "overall": overall, "groups": groups,
            "groups_hidden_small_n": hidden, "min_n": MIN_SALARY_N}


def histogram(store: Store, f: Filters, kind: Kind, periods: list[str] | None, bin_width: int = 10_000) -> dict:
    cte, params = f.cte()
    pc, pp = _period_clause(periods)
    cap = 400_000
    rows = store.rows(f"""{cte}
        SELECT least(floor(salary_usd_annual / ?) * ?, ?) AS bin, count(*) AS n FROM f
        WHERE salary_kind = ? {pc} GROUP BY 1 ORDER BY 1""", [*params, bin_width, bin_width, cap, kind, *pp])
    return {"kind": kind, "bin_width": bin_width, "cap": cap, "bins": rows}
