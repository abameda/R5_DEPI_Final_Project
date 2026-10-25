"""Time intelligence.

The data has two collection cohorts that are NOT one longitudinal sample:
  * kaggle_2023     - one dataset, one method, postings dated Jan-Dec 2023;
  * collected_2026  - the team's API/board collection, mostly Sep-Oct 2026.

So: monthly trends are computed only WITHIN a cohort (and months with fewer
than MIN_GROUP_POSTINGS postings are flagged), and the two cohorts are shown
side by side as snapshots, never as a growth rate.
"""
from __future__ import annotations

from ..db import Store
from ..filters import Filters
from ..labels import MIN_GROUP_POSTINGS, share
from .market import skilled_col
from .skills import top_skills


def skill_trend(store: Store, f: Filters, skills: list[str]) -> dict:
    """Monthly share of postings (with skill data) listing each skill, per cohort."""
    cte, params = f.cte()
    sk = skilled_col(f)
    months = store.rows(f"""{cte}
        SELECT cohort, posted_month AS month, count(*) FILTER (WHERE {sk} > 0) AS denominator, count(*) AS postings
        FROM f WHERE posted_month IS NOT NULL GROUP BY ALL ORDER BY month""", params)
    if not skills:
        return {"months": months, "series": []}
    cells = store.rows(f"""{cte}
        SELECT f.cohort, f.posted_month AS month, s.skill, count(*) AS n
        FROM job_skills s JOIN f USING (jid)
        WHERE f.posted_month IS NOT NULL AND s.skill IN ({', '.join('?' * len(skills))}) {f.skill_condition()}
        GROUP BY ALL""", [*params, *skills])
    den = {(m["cohort"], m["month"]): m["denominator"] for m in months}
    series = []
    for skill in skills:
        pts = []
        for c in cells:
            if c["skill"] == skill:
                d = den[(c["cohort"], c["month"])]
                pts.append({"cohort": c["cohort"], "month": c["month"], "n": c["n"], "denominator": d,
                            "share": share(c["n"], d), "reliable": d >= MIN_GROUP_POSTINGS})
        pts.sort(key=lambda p: p["month"])
        series.append({"skill": skill, "points": pts})
    for m in months:
        m["reliable"] = m["denominator"] >= MIN_GROUP_POSTINGS
    return {"months": months, "series": series}


def _half_year_change(store: Store, f: Filters, skills: list[str]) -> list[dict]:
    """Within the 2023 cohort only: share in Jan-Jun vs Jul-Dec (percentage points)."""
    g = f.model_copy(update={"cohort": ["kaggle_2023"]})
    cte, params = g.cte()
    sk = skilled_col(g)
    den = {r["h"]: r["d"] for r in store.rows(f"""{cte}
        SELECT month(posted_date) > 6 AS h, count(*) FILTER (WHERE {sk} > 0) AS d FROM f
        WHERE posted_date IS NOT NULL GROUP BY 1""", params)}
    if not skills or den.get(False, 0) < MIN_GROUP_POSTINGS or den.get(True, 0) < MIN_GROUP_POSTINGS:
        return []
    rows = store.rows(f"""{cte}
        SELECT s.skill, count(*) FILTER (WHERE month(f.posted_date) <= 6) AS h1,
               count(*) FILTER (WHERE month(f.posted_date) > 6) AS h2
        FROM job_skills s JOIN f USING (jid)
        WHERE f.posted_date IS NOT NULL AND s.skill IN ({', '.join('?' * len(skills))}) {g.skill_condition()}
        GROUP BY 1""", [*params, *skills])
    out = []
    for r in rows:
        s1, s2 = r["h1"] / den[False], r["h2"] / den[True]
        out.append({"skill": r["skill"], "h1_share": round(s1, 4), "h2_share": round(s2, 4),
                    "change_pp": round(100 * (s2 - s1), 2), "h1_denominator": den[False],
                    "h2_denominator": den[True]})
    out.sort(key=lambda r: -r["change_pp"])
    return out


def cohort_snapshot(store: Store, f: Filters, limit: int = 15) -> dict:
    """Top skills per cohort, side by side (NOT a trend)."""
    out = {}
    for cohort in ("kaggle_2023", "collected_2026"):
        g = f.model_copy(update={"cohort": [cohort]})
        out[cohort] = top_skills(store, g, limit=limit)
    return out


def trends(store: Store, f: Filters, skills: list[str]) -> dict:
    if not skills:
        skills = [r["skill"] for r in top_skills(store, f, limit=6)["rows"]]
    cte, params = f.cte()
    roles = store.rows(f"""{cte}
        SELECT posted_month AS month, role_category AS role, count(*) AS n FROM f
        WHERE cohort = 'kaggle_2023' AND posted_month IS NOT NULL GROUP BY ALL ORDER BY month""", params)
    top_movers_pool = [r["skill"] for r in top_skills(store, f.model_copy(update={"cohort": ["kaggle_2023"]}),
                                                     limit=30)["rows"]]
    return {
        "skills": skills,
        "skill_trend": skill_trend(store, f, skills),
        "roles_2023": roles,
        "half_year_2023": _half_year_change(store, f, top_movers_pool),
        "snapshot": cohort_snapshot(store, f),
        "min_group": MIN_GROUP_POSTINGS,
    }
