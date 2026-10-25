"""Market-level queries: overview KPIs, job explorer, geography and employers."""
from __future__ import annotations

from fastapi import HTTPException

from ..db import Store
from ..filters import Filters
from ..labels import MIN_GROUP_POSTINGS, MIN_SALARY_N, salary_confidence, share

# Columns that may be used as a GROUP BY dimension (whitelist -> SQL is never built from input).
BREAKDOWN_DIMS = {"role_category", "country", "region", "market_type", "seniority", "job_type",
                  "work_mode", "source_dataset", "cohort", "language", "company"}


def skilled_col(f: Filters) -> str:
    """Posting-level column that says whether a posting has (observed) skills."""
    return "skills_observed_count" if f.provenance == "observed" else "skills_count"


def breakdown(store: Store, f: Filters, dim: str, limit: int | None = None) -> list[dict]:
    if dim not in BREAKDOWN_DIMS:
        raise HTTPException(422, f"Unsupported dimension: {dim}")
    cte, params = f.cte()
    rows = store.rows(f"""{cte}
        SELECT {dim} AS key, count(*) AS n FROM f GROUP BY 1 ORDER BY n DESC, key
        {'LIMIT ' + str(int(limit)) if limit else ''}""", params)
    total = store.scalar(f"{cte} SELECT count(*) FROM f", params) or 0
    for r in rows:
        r["share"] = share(r["n"], total)
    return rows


def kpis(store: Store, f: Filters) -> dict:
    cte, params = f.cte()
    k = store.one(f"""{cte}
        SELECT count(*) AS postings,
               sum(duplicate_count) AS appearances,
               count(DISTINCT country) AS countries,
               count(*) FILTER (WHERE country IS NULL) AS no_country,
               count(DISTINCT company) FILTER (WHERE NOT company_is_placeholder) AS employers,
               count(DISTINCT role_category) AS role_categories,
               count(DISTINCT lower(title)) AS distinct_titles,
               count(*) FILTER (WHERE {skilled_col(f)} > 0) AS with_skills,
               count(*) FILTER (WHERE salary_kind = 'advertised') AS advertised_salary,
               count(*) FILTER (WHERE salary_kind = 'benchmark') AS benchmark_salary,
               count(*) FILTER (WHERE market_type = 'Arab') AS arab,
               count(*) FILTER (WHERE market_type = 'Remote') AS remote,
               min(posted_date) AS first_posted, max(posted_date) AS last_posted,
               count(*) FILTER (WHERE posted_date IS NULL) AS undated,
               count(DISTINCT source_dataset) AS sources
        FROM f""", params)
    k["distinct_skills"] = store.scalar(f"""{cte}
        SELECT count(DISTINCT s.skill) FROM job_skills s JOIN f USING (jid) WHERE TRUE {f.skill_condition()}""",
                                        params) or 0
    k["appearances"] = int(k["appearances"] or 0)
    return k


def overview(store: Store, f: Filters) -> dict:
    from .skills import skill_categories, top_skills
    cte, params = f.cte()
    months = store.rows(f"""{cte}
        SELECT cohort, posted_month AS month, count(*) AS n FROM f
        WHERE posted_month IS NOT NULL GROUP BY ALL ORDER BY month""", params)
    hist = store.rows(f"""{cte}
        SELECT least(floor(salary_usd_annual / 20000) * 20000, 300000) AS bin, count(*) AS n
        FROM f WHERE salary_kind = 'advertised' GROUP BY 1 ORDER BY 1""", params)
    return {
        "kpis": kpis(store, f),
        "roles": breakdown(store, f, "role_category"),
        "markets": breakdown(store, f, "market_type"),
        "regions": breakdown(store, f, "region"),
        "seniority": breakdown(store, f, "seniority"),
        "work_mode": breakdown(store, f, "work_mode"),
        "job_type": breakdown(store, f, "job_type"),
        "sources": breakdown(store, f, "source_dataset"),
        "cohorts": breakdown(store, f, "cohort"),
        "countries": breakdown(store, f, "country", limit=15),
        "top_skills": top_skills(store, f, limit=15),
        "skill_categories": skill_categories(store, f),
        "months": months,
        "salary_histogram": hist,
    }


# ---------------------------------------------------------------------------
# Job explorer
# ---------------------------------------------------------------------------
SORTS = {
    "newest": "posted_date DESC NULLS LAST, jid",
    "oldest": "posted_date ASC NULLS LAST, jid",
    "salary_high": "(salary_kind = 'advertised') DESC, salary_usd_annual DESC NULLS LAST, jid",
    "salary_low": "(salary_kind = 'advertised') DESC, salary_usd_annual ASC NULLS LAST, jid",
    "title": "title, jid",
    "company": "company NULLS LAST, jid",
    "most_listed": "duplicate_count DESC, jid",
}
LIST_COLUMNS = """job_id, jid, title, company, company_is_placeholder, role_category, seniority, country, city,
    location, region, market_type, work_mode, job_type, language, salary_kind, salary_usd_annual,
    salary_min, salary_max, salary_currency, salary_period, posted_date, cohort, source_dataset,
    source_platform, duplicate_count, url, skills_count, skills_observed_count"""
MAX_OFFSET = 10_000


def _attach_skills(store: Store, rows: list[dict]) -> None:
    if not rows:
        return
    ids = [r["jid"] for r in rows]
    skills = store.rows(f"""
        SELECT s.jid, s.skill, s.is_observed, k.category
        FROM job_skills s JOIN skills k USING (skill)
        WHERE s.jid IN ({', '.join('?' * len(ids))}) ORDER BY s.jid, NOT s.is_observed, s.skill""", ids)
    by = {}
    for s in skills:
        by.setdefault(s["jid"], []).append({"skill": s["skill"], "observed": s["is_observed"],
                                            "category": s["category"]})
    for r in rows:
        r["skill_list"] = by.get(r["jid"], [])


def list_jobs(store: Store, f: Filters, page: int, page_size: int, sort: str) -> dict:
    if sort not in SORTS:
        raise HTTPException(422, f"Unsupported sort: {sort}")
    offset = (page - 1) * page_size
    if offset > MAX_OFFSET:
        raise HTTPException(422, f"Pages beyond {MAX_OFFSET:,} results are not served; narrow the filters.")
    cte, params = f.cte()
    total = store.scalar(f"{cte} SELECT count(*) FROM f", params) or 0
    rows = store.rows(f"""{cte} SELECT {LIST_COLUMNS} FROM f ORDER BY {SORTS[sort]} LIMIT ? OFFSET ?""",
                      [*params, page_size, offset])
    _attach_skills(store, rows)
    for r in rows:
        r.pop("jid")
    return {"total": total, "page": page, "page_size": page_size, "sort": sort, "rows": rows}


def job_detail(store: Store, job_id: str) -> dict:
    rows = store.rows(f"SELECT {LIST_COLUMNS}, description, sources, search_keyword FROM jobs WHERE job_id = ?",
                      [job_id])
    if not rows:
        raise HTTPException(404, "Posting not found")
    _attach_skills(store, rows)
    row = rows[0]
    row.pop("jid")
    return row


# ---------------------------------------------------------------------------
# Geography
# ---------------------------------------------------------------------------
def countries(store: Store, f: Filters) -> dict:
    cte, params = f.cte()
    sk = skilled_col(f)
    rows = store.rows(f"""{cte},
        c AS (
            SELECT country, any_value(region) AS region, count(*) AS n,
                   count(*) FILTER (WHERE market_type = 'Remote') AS remote,
                   count(*) FILTER (WHERE {sk} > 0) AS with_skills,
                   count(DISTINCT company) FILTER (WHERE NOT company_is_placeholder) AS employers,
                   count(*) FILTER (WHERE salary_kind = 'advertised') AS salary_n,
                   median(salary_usd_annual) FILTER (WHERE salary_kind = 'advertised') AS salary_median,
                   count(*) FILTER (WHERE cohort = 'kaggle_2023') AS kaggle_2023
            FROM f WHERE country IS NOT NULL GROUP BY country),
        r AS (
            SELECT country, role_category, count(*) AS n,
                   row_number() OVER (PARTITION BY country ORDER BY count(*) DESC, role_category) AS rk
            FROM f WHERE country IS NOT NULL GROUP BY country, role_category),
        s AS (
            SELECT f.country, sk.skill, count(*) AS n,
                   row_number() OVER (PARTITION BY f.country ORDER BY count(*) DESC, sk.skill) AS rk
            FROM job_skills sk JOIN f USING (jid)
            WHERE f.country IS NOT NULL {f.skill_condition('sk')} GROUP BY f.country, sk.skill)
        SELECT c.*, r.role_category AS top_role, r.n AS top_role_n, s.skill AS top_skill, s.n AS top_skill_n
        FROM c LEFT JOIN r ON r.country = c.country AND r.rk = 1
               LEFT JOIN s ON s.country = c.country AND s.rk = 1
        ORDER BY c.n DESC""", params)
    total = sum(r["n"] for r in rows)
    no_country = store.scalar(f"{cte} SELECT count(*) FROM f WHERE country IS NULL", params) or 0
    for r in rows:
        r["share"] = share(r["n"], total + no_country)
        r["top_skill_share"] = share(r["top_skill_n"] or 0, r["with_skills"])
        r["top_role_share"] = share(r["top_role_n"] or 0, r["n"])
        r["salary_confidence"] = salary_confidence(r["salary_n"])
        if r["salary_n"] < MIN_SALARY_N:
            r["salary_median"] = None
        r["small_sample"] = r["n"] < MIN_GROUP_POSTINGS
    top3 = sum(r["n"] for r in rows[:3])
    hhi = sum((r["n"] / total) ** 2 for r in rows) if total else None
    return {"countries": rows, "no_country": no_country, "located": total,
            "concentration": {"top3_share": share(top3, total), "hhi": round(hhi, 4) if hhi else None}}


def crosstab(store: Store, f: Filters, row_dim: str, col_dim: str, rows_limit: int, cols_limit: int) -> dict:
    """Postings by two posting-level dimensions; shares are within each row."""
    for d in (row_dim, col_dim):
        if d not in BREAKDOWN_DIMS:
            raise HTTPException(422, f"Unsupported dimension: {d}")
    cte, params = f.cte()
    rows = store.rows(f"""{cte},
        rt AS (SELECT {row_dim} AS r, count(*) AS n FROM f WHERE {row_dim} IS NOT NULL GROUP BY 1
               ORDER BY n DESC LIMIT {int(rows_limit)}),
        ct AS (SELECT {col_dim} AS c, count(*) AS n FROM f WHERE {col_dim} IS NOT NULL GROUP BY 1
               ORDER BY n DESC LIMIT {int(cols_limit)})
        SELECT f.{row_dim} AS r, f.{col_dim} AS c, count(*) AS n FROM f
        WHERE f.{row_dim} IN (SELECT r FROM rt) AND f.{col_dim} IN (SELECT c FROM ct) GROUP BY ALL""", params)
    row_tot = store.rows(f"""{cte} SELECT {row_dim} AS key, count(*) AS n FROM f WHERE {row_dim} IS NOT NULL
        GROUP BY 1 ORDER BY n DESC LIMIT {int(rows_limit)}""", params)
    col_keys = [r["c"] for r in store.rows(f"""{cte} SELECT {col_dim} AS c, count(*) n FROM f
        WHERE {col_dim} IS NOT NULL GROUP BY 1 ORDER BY n DESC LIMIT {int(cols_limit)}""", params)]
    totals = {r["key"]: r["n"] for r in row_tot}
    cells = [{"row": c["r"], "col": c["c"], "n": c["n"], "share": share(c["n"], totals[c["r"]])} for c in rows]
    return {"rows": row_tot, "cols": col_keys, "cells": cells}


# ---------------------------------------------------------------------------
# Employers
# ---------------------------------------------------------------------------
COMPANY_SORTS = {"postings": "postings DESC, company", "name": "company",
                 "salary": "salary_median DESC NULLS LAST, company", "recent": "last_posted DESC NULLS LAST, company"}


def companies(store: Store, f: Filters, search: str | None, page: int, page_size: int, sort: str,
              include_placeholders: bool) -> dict:
    if sort not in COMPANY_SORTS:
        raise HTTPException(422, f"Unsupported sort: {sort}")
    cte, params = f.cte()
    cond, extra = ["company IS NOT NULL"], []
    if not include_placeholders:
        cond.append("NOT company_is_placeholder")
    if search:
        cond.append("company ILIKE ? ESCAPE '\\'")
        extra.append("%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%")
    where = " AND ".join(cond)
    total = store.scalar(f"{cte} SELECT count(DISTINCT company) FROM f WHERE {where}", [*params, *extra]) or 0
    rows = store.rows(f"""{cte}
        SELECT company, count(*) AS postings, sum(duplicate_count) AS appearances,
               count(DISTINCT country) AS countries, mode(role_category) AS top_role,
               any_value(company_is_placeholder) AS is_placeholder,
               count(*) FILTER (WHERE salary_kind = 'advertised') AS salary_n,
               median(salary_usd_annual) FILTER (WHERE salary_kind = 'advertised') AS salary_median,
               max(posted_date) AS last_posted
        FROM f WHERE {where} GROUP BY company ORDER BY {COMPANY_SORTS[sort]} LIMIT ? OFFSET ?""",
                      [*params, *extra, page_size, (page - 1) * page_size])
    for r in rows:
        r["appearances"] = int(r["appearances"] or 0)
        if r["salary_n"] < MIN_SALARY_N:
            r["salary_median"] = None
    return {"total": total, "page": page, "page_size": page_size, "rows": rows}


def company_profile(store: Store, f: Filters, company: str) -> dict:
    from .salary import salary_summary
    from .skills import top_skills
    g = f.model_copy(update={"company": [company]})
    k = kpis(store, g)
    if not k["postings"]:
        raise HTTPException(404, "No postings for this employer with the current filters")
    cte, params = g.cte()
    titles = store.rows(f"""{cte} SELECT title AS key, count(*) AS n FROM f GROUP BY 1 ORDER BY n DESC, key
        LIMIT 10""", params)
    placeholder = store.scalar("SELECT bool_or(company_is_placeholder) FROM jobs WHERE company = ?", [company])
    return {
        "company": company,
        "is_placeholder": bool(placeholder),
        "kpis": k,
        "titles": titles,
        "roles": breakdown(store, g, "role_category"),
        "countries": breakdown(store, g, "country", limit=12),
        "seniority": breakdown(store, g, "seniority"),
        "work_mode": breakdown(store, g, "work_mode"),
        "cohorts": breakdown(store, g, "cohort"),
        "top_skills": top_skills(store, g, limit=15),
        "salary": salary_summary(store, g, "role_category", "advertised", None),
    }
