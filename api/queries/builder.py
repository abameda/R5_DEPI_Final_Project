"""Interactive Insight Builder + guided insights.

The builder only combines whitelisted dimensions and metrics; the SQL for each
is fixed here, so no user text ever becomes SQL. Combinations that would be
misleading are rejected with an explanation (see `validate`).
"""
from __future__ import annotations

import csv
import io
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field

from ..db import Store
from ..filters import Filters
from ..labels import DIMENSION_LABELS, MIN_GROUP_POSTINGS, MIN_SALARY_N, share
from .market import skilled_col

# dimension -> (SQL expression, needs the job_skills join)
DIMENSIONS: dict[str, tuple[str, bool]] = {
    "role_category": ("f.role_category", False), "country": ("f.country", False),
    "region": ("f.region", False), "market_type": ("f.market_type", False),
    "seniority": ("f.seniority", False), "job_type": ("f.job_type", False),
    "work_mode": ("f.work_mode", False), "source_dataset": ("f.source_dataset", False),
    "cohort": ("f.cohort", False), "language": ("f.language", False),
    "posted_month": ("strftime(f.posted_month, '%Y-%m')", False),
    "posted_year": ("CAST(f.posted_year AS VARCHAR)", False),
    "company": ("CASE WHEN f.company_is_placeholder THEN NULL ELSE f.company END", False),
    "skill": ("s.skill", True), "skill_category": ("k.category", True),
}
METRICS = {
    "postings": "Postings",
    "share": "Share of postings",
    "employers": "Distinct employers",
    "median_salary": "Median advertised salary (USD/yr)",
    "salary_coverage": "Share with an advertised salary",
    "remote_share": "Share remote",
    "avg_skills": "Average skills per posting that lists skills",
}
SKILL_DIM_METRICS = {"postings", "share", "employers", "median_salary"}


class BuilderRequest(BaseModel):
    dimension: str
    split_by: str | None = None
    metric: str = "postings"
    limit: int = Field(15, ge=1, le=50)
    sort: Literal["metric_desc", "metric_asc", "label"] = "metric_desc"
    filters: Filters = Field(default_factory=Filters)


def validate(req: BuilderRequest) -> list[tuple[str, str]]:
    """Reject nonsensical combinations; return (code, text) warnings for legitimate-but-risky ones."""
    if req.dimension not in DIMENSIONS:
        raise HTTPException(422, f"Unsupported dimension: {req.dimension}")
    if req.split_by is not None and req.split_by not in DIMENSIONS:
        raise HTTPException(422, f"Unsupported split: {req.split_by}")
    if req.metric not in METRICS:
        raise HTTPException(422, f"Unsupported metric: {req.metric}")
    if req.split_by == req.dimension:
        raise HTTPException(422, "Split by a different dimension than the main one.")
    skill_dims = [d for d in (req.dimension, req.split_by) if d and DIMENSIONS[d][1]]
    if len(skill_dims) > 1:
        raise HTTPException(422, "Only one skill dimension per chart (skill × skill is the co-occurrence view).")
    if skill_dims and req.metric not in SKILL_DIM_METRICS:
        raise HTTPException(422, f"'{METRICS[req.metric]}' is a posting-level metric and is not defined per skill.")
    warnings = []
    if "posted_month" in (req.dimension, req.split_by) or "posted_year" in (req.dimension, req.split_by):
        if req.filters.cohort != ["kaggle_2023"] and req.filters.cohort != ["collected_2026"]:
            warnings.append(("mixed_cohorts", "Time axis spans two collection cohorts (2023 archive and 2024–26 collection). "
                                             "Filter on one cohort before reading a trend."))
    if req.metric == "median_salary":
        warnings.append(("advertised_salary_only", f"Advertised salaries only, annualized to USD at fixed approximate rates; "
                                                   f"groups with fewer than {MIN_SALARY_N} salaries are hidden."))
    if skill_dims and req.filters.provenance == "all":
        warnings.append(("team_added_skills", "Skill counts include skills the team added after collection; switch provenance to "
                                              "'observed' for posting-written skills only."))
    return warnings


def _metric_sql(metric: str, f: Filters, skill_join: bool) -> str:
    unit = "DISTINCT f.jid" if skill_join else "*"
    return {
        "postings": f"count({unit})",
        "share": f"count({unit})",
        "employers": "count(DISTINCT f.company) FILTER (WHERE NOT f.company_is_placeholder)",
        "median_salary": "median(f.salary_usd_annual) FILTER (WHERE f.salary_kind = 'advertised')",
        "salary_coverage": "avg(CASE WHEN f.salary_kind = 'advertised' THEN 1.0 ELSE 0.0 END)",
        "remote_share": "avg(CASE WHEN f.market_type = 'Remote' THEN 1.0 ELSE 0.0 END)",
        "avg_skills": f"avg(f.{skilled_col(f)}) FILTER (WHERE f.{skilled_col(f)} > 0)",
    }[metric]


def run(store: Store, req: BuilderRequest) -> dict:
    warnings = validate(req)
    f = req.filters
    dims = [d for d in (req.dimension, req.split_by) if d]
    skill_join = any(DIMENSIONS[d][1] for d in dims)
    exprs = [DIMENSIONS[d][0] for d in dims]
    cte, params = f.cte()
    src = "f"
    if "skill_category" in dims:
        # one row per (posting, category): a posting with three Python-family
        # skills must count once for its category, not three times
        src = (f"(SELECT DISTINCT s.jid, k.category FROM job_skills s JOIN skills k USING (skill) "
               f"WHERE TRUE {f.skill_condition()}) k JOIN f USING (jid) WHERE TRUE")
    elif skill_join:
        src = f"job_skills s JOIN f USING (jid) JOIN skills k USING (skill) WHERE TRUE {f.skill_condition()}"
    where_word = "AND" if skill_join else "WHERE"
    not_null = " AND ".join(f"{e} IS NOT NULL" for e in exprs)
    metric = _metric_sql(req.metric, f, skill_join)
    salary_n = "count(*) FILTER (WHERE f.salary_kind = 'advertised')"
    labels = ", ".join(f"{e} AS d{i}" for i, e in enumerate(exprs))
    group = ", ".join(f"d{i}" for i in range(len(exprs)))
    # keep only the top `limit` values of the main dimension (by postings)
    top = f"""top AS (SELECT {exprs[0]} AS d0 FROM {src} {where_word} {exprs[0]} IS NOT NULL
               GROUP BY 1 ORDER BY count({'DISTINCT f.jid' if skill_join else '*'}) DESC LIMIT ?)"""
    split_top = ""
    split_params: list = []
    if req.split_by:
        split_top = f""", top2 AS (SELECT {exprs[1]} AS d1 FROM {src} {where_word} {exprs[1]} IS NOT NULL
               GROUP BY 1 ORDER BY count({'DISTINCT f.jid' if skill_join else '*'}) DESC LIMIT 8)"""
    rows = store.rows(f"""{cte}, {top}{split_top}
        SELECT {labels}, {metric} AS value, count({'DISTINCT f.jid' if skill_join else '*'}) AS postings,
               {salary_n} AS salary_n
        FROM {src} {where_word} {not_null}
          AND {exprs[0]} IN (SELECT d0 FROM top)
          {'AND ' + exprs[1] + ' IN (SELECT d1 FROM top2)' if req.split_by else ''}
        GROUP BY {group}""", [*params, req.limit, *split_params])

    metric_label = METRICS[req.metric]
    share_within = None
    if req.metric == "share":
        # Denominator = the posting-level group the share is read within:
        #  * skill dimension + posting dimension -> that group's postings with skills
        #  * skill dimension alone               -> all postings with skills
        #  * two posting dimensions              -> postings of the main group (rows sum to 100%)
        #  * one posting dimension               -> all postings
        sk = skilled_col(f)
        group_i = next((i for i, d in enumerate(dims) if not DIMENSIONS[d][1]), None) if skill_join else (0 if req.split_by else None)
        cond = f"{sk} > 0" if skill_join else "TRUE"
        if group_i is None:
            denom = store.scalar(f"{cte} SELECT count(*) FROM f WHERE {cond}", params) or 0
            for r in rows:
                r["value"] = share(r["value"], denom)
            metric_label = "Share of postings that list skills" if skill_join else "Share of postings"
        else:
            e = exprs[group_i]
            share_within = dims[group_i]
            dens = {d["k"]: d["n"] for d in store.rows(
                f"{cte} SELECT {e} AS k, count(*) AS n FROM f WHERE {cond} AND {e} IS NOT NULL GROUP BY 1", params)}
            for r in rows:
                r["value"] = share(r["value"], dens.get(r[f"d{group_i}"], 0))
            metric_label = f"Share of each {DIMENSION_LABELS[dims[group_i]].lower()}'s postings" + (" that list skills" if skill_join else "")
    hidden = 0
    if req.metric == "median_salary":
        for r in rows:
            if r["salary_n"] < MIN_SALARY_N:
                r["value"] = None
                hidden += 1
    for r in rows:
        r["small_sample"] = r["postings"] < MIN_GROUP_POSTINGS
    reverse = req.sort == "metric_desc"
    if req.sort == "label" or req.dimension in ("posted_month", "posted_year"):
        rows.sort(key=lambda r: (str(r["d0"]), str(r.get("d1", ""))))
    else:
        rows.sort(key=lambda r: ((r["value"] is None) if reverse else (r["value"] is not None),
                                 r["value"] or 0), reverse=reverse)
    return {
        "dimension": req.dimension, "split_by": req.split_by, "metric": req.metric,
        "metric_label": metric_label,
        # the posting-level dimension a share is read within (None: all postings)
        "share_within": share_within,
        "dimension_label": DIMENSION_LABELS[req.dimension],
        "split_label": DIMENSION_LABELS.get(req.split_by) if req.split_by else None,
        "rows": rows, "warnings": [text for _, text in warnings],
        "warning_codes": [code for code, _ in warnings], "hidden_small_salary_groups": hidden,
        "filters": f.active(),
    }


def _cell(v):
    """Neutralize spreadsheet formulas: employer names such as '+OneX' or '@Orchard'."""
    return "'" + v if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r") else v


def to_csv(result: dict) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    head = [result["dimension_label"]] + ([result["split_label"]] if result["split_by"] else [])
    w.writerow(head + [result["metric_label"], "Postings (n)", "Advertised salaries (n)"])
    for r in result["rows"]:
        w.writerow([_cell(r["d0"])] + ([_cell(r.get("d1"))] if result["split_by"] else [])
                   + [r["value"], r["postings"], r["salary_n"]])
    w.writerow([])
    w.writerow(["# Aggregated from the Job Market Intelligence dataset (job-posting sample, not the whole market)."])
    w.writerow([f"# Filters: {result['filters'] or 'none'}"])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Guided insights: every number below comes from a query on the current filters.
# ---------------------------------------------------------------------------
def _pct(x: float | None) -> str:
    return "—" if x is None else f"{100 * x:.1f}%"


def insights(store: Store, f: Filters) -> list[dict]:
    from .market import countries, kpis
    from .salary import salary_summary
    from .skills import cooccurrence, top_skills

    out: list[dict] = []
    k = kpis(store, f)
    n = k["postings"]
    if not n:
        return out
    prov = "observed in postings" if f.provenance == "observed" else "including team-added skills"
    ts = top_skills(store, f, limit=10)
    d = ts["denominator"]
    if d >= MIN_GROUP_POSTINGS and ts["rows"]:
        a = ts["rows"][0]
        out.append({"id": "top_skill", "kind": "skills",
                    "text": f"{a['skill']} appears in {_pct(a['share'])} of the {d:,} selected postings that list "
                            f"skills ({prov}).",
                    "value": a["share"], "n": a["postings"], "denominator": d,
                    "drill": {"path": "/skills", "params": {"skill": a["skill"]}},
                    "args": {"skill": a["skill"], "share": a["share"], "denominator": d}})
        if len(ts["rows"]) > 1:
            b = ts["rows"][1]
            out.append({"id": "top_two", "kind": "skills",
                        "text": f"{a['skill']} is requested more often than {b['skill']} "
                                f"({_pct(a['share'])} vs {_pct(b['share'])}).",
                        "value": a["share"] - b["share"], "n": d, "denominator": d,
                        "drill": {"path": "/compare", "params": {"a.skill": a["skill"], "b.skill": b["skill"]}},
                        "args": {"a": a["skill"], "b": b["skill"], "a_share": a["share"], "b_share": b["share"]}})
        added = sum(r["added"] for r in ts["rows"])
        mentions = sum(r["postings"] for r in ts["rows"])
        if f.provenance == "all" and mentions:
            out.append({"id": "enrichment", "kind": "provenance",
                        "text": f"{_pct(added / mentions)} of the mentions of these 10 skills were added by the "
                                f"team after collection, not written in the posting data.",
                        "value": added / mentions, "n": mentions, "denominator": mentions,
                        "drill": {"path": "/quality", "params": {}},
                        "args": {"share": added / mentions}})
    cte, params = f.cte()
    role = store.one(f"{cte} SELECT role_category AS key, count(*) AS n FROM f GROUP BY 1 ORDER BY n DESC LIMIT 1",
                     params)
    if role:
        out.append({"id": "top_role", "kind": "roles",
                    "text": f"{role['key']} is the most common role category: {role['n']:,} of {n:,} postings "
                            f"({_pct(share(role['n'], n))}).",
                    "value": share(role["n"], n), "n": role["n"], "denominator": n,
                    "drill": {"path": "/explorer", "params": {"role": role["key"]}},
                    "args": {"role": role["key"], "n": role["n"], "total": n, "share": share(role["n"], n)}})
    if not f.market or "Remote" in f.market:
        out.append({"id": "remote", "kind": "market",
                    "text": f"{_pct(share(k['remote'], n))} of the selected postings are remote "
                            f"({k['remote']:,} of {n:,}).",
                    "value": share(k["remote"], n), "n": k["remote"], "denominator": n,
                    "drill": {"path": "/explorer", "params": {"market": "Remote"}},
                    "args": {"share": share(k["remote"], n), "n": k["remote"], "total": n}})
    sal = salary_summary(store, f, None, "advertised", None)["overall"]
    if (sal.get("n") or 0) >= MIN_SALARY_N:
        out.append({"id": "salary", "kind": "salary",
                    "text": f"{sal['n']:,} selected postings advertise a salary; their median is about "
                            f"${sal['median']:,.0f} per year (annualized, approximate USD"
                            + (f", converted from {sal['currencies']} currencies at fixed rates" if sal["currencies"] > 1 else "")
                            + ").",
                    "value": sal["median"], "n": sal["n"], "denominator": n,
                    "drill": {"path": "/salary", "params": {}},
                    "args": {"n": sal["n"], "median": sal["median"], "currencies": sal["currencies"]}})
    else:
        out.append({"id": "salary", "kind": "salary",
                    "text": f"Only {sal.get('n') or 0} selected postings advertise a salary — too few for a "
                            f"reliable median (minimum {MIN_SALARY_N}).",
                    "value": None, "n": sal.get("n") or 0, "denominator": n,
                    "drill": {"path": "/salary", "params": {}},
                    "args": {"n": sal.get("n") or 0, "min": MIN_SALARY_N}})
    geo = countries(store, f)
    if geo["countries"] and geo["located"] >= MIN_GROUP_POSTINGS:
        top3 = ", ".join(c["country"] for c in geo["countries"][:3])
        out.append({"id": "concentration", "kind": "geography",
                    "text": f"The top 3 countries ({top3}) hold {_pct(geo['concentration']['top3_share'])} of "
                            f"postings with a known country — the sample is geographically concentrated.",
                    "value": geo["concentration"]["top3_share"], "n": geo["located"], "denominator": geo["located"],
                    "drill": {"path": "/geography", "params": {}},
                    "args": {"countries": [c["country"] for c in geo["countries"][:3]],
                             "share": geo["concentration"]["top3_share"]}})
    # pairs come from skills written in the postings: team-added skills were
    # appended as fixed blocks and would manufacture strong "pairs"
    co = cooccurrence(store, f.model_copy(update={"provenance": "observed"}), limit=15)
    strong = [link for link in co["links"] if link["together"] >= max(MIN_GROUP_POSTINGS, 0.02 * co["denominator"])]
    if strong:
        best = max(strong, key=lambda link: link["lift"] or 0)
        out.append({"id": "pairing", "kind": "skills",
                    "text": f"{best['a']} and {best['b']} are written together {best['lift']:.1f}× as often as if they "
                            f"were independent ({best['together']:,} postings; skills written in the posting only).",
                    "value": best["lift"], "n": best["together"], "denominator": co["denominator"],
                    "drill": {"path": "/skills", "params": {"skill": best["a"]}},
                    "args": {"a": best["a"], "b": best["b"], "lift": best["lift"], "together": best["together"]}})
    kag = store.scalar(f"{cte} SELECT count(*) FROM f WHERE cohort = 'kaggle_2023'", params) or 0
    out.append({"id": "cohort_mix", "kind": "provenance",
                "text": f"{_pct(share(kag, n))} of the selected postings come from the 2023 Kaggle archive; the rest "
                        f"were collected in 2024–26. Read time differences with care.",
                "value": share(kag, n), "n": kag, "denominator": n,
                "drill": {"path": "/trends", "params": {}},
                "args": {"share": share(kag, n)}})
    for i in out:
        i["filters"] = f.active()
        i["provenance"] = f.provenance
    return out
