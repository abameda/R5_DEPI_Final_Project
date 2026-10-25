"""Market Comparison Studio: two filter sets side by side.

Every number is normalized within its own segment (share of that segment's
postings, or of its postings with skill data), and every comparison carries
the sample sizes and the warnings that apply to it.
"""
from __future__ import annotations

from ..db import Store
from ..filters import Filters
from ..labels import MIN_GROUP_POSTINGS, MIN_SALARY_N, RELIABLE_SALARY_N, share
from .market import breakdown, kpis
from .salary import salary_summary
from .skills import top_skills

# A skill "appears mainly in one segment" when its share there is at least this
# many times the other segment's share AND the gap is at least MIN_GAP_PP points.
DOMINANCE_RATIO = 2.0
MIN_GAP_PP = 5.0


def _segment(store: Store, f: Filters) -> dict:
    k = kpis(store, f)
    sal = salary_summary(store, f, None, "advertised", None)["overall"]
    return {
        "kpis": k,
        "salary": sal,
        "cohorts": breakdown(store, f, "cohort"),
        "sources": breakdown(store, f, "source_dataset"),
        "roles": breakdown(store, f, "role_category", limit=8),
        "seniority": breakdown(store, f, "seniority"),
        "work_mode": breakdown(store, f, "work_mode"),
        "top_skills": top_skills(store, f, limit=20),
    }


def _main_cohort(seg: dict) -> tuple[str | None, float]:
    if not seg["cohorts"]:
        return None, 0.0
    top = seg["cohorts"][0]
    return top["key"], top["share"] or 0.0


def compare(store: Store, a: Filters, b: Filters) -> dict:
    sa, sb = _segment(store, a), _segment(store, b)
    da, db = sa["top_skills"]["denominator"], sb["top_skills"]["denominator"]
    names = list(dict.fromkeys([r["skill"] for r in sa["top_skills"]["rows"][:15]]
                               + [r["skill"] for r in sb["top_skills"]["rows"][:15]]))
    # exact counts for the union (a skill may be outside one segment's top list)
    counts = {}
    for key, f in (("a", a), ("b", b)):
        cte, params = f.cte()
        if names:
            rows = store.rows(f"""{cte} SELECT s.skill, count(*) AS n FROM job_skills s JOIN f USING (jid)
                WHERE s.skill IN ({', '.join('?' * len(names))}) {f.skill_condition()} GROUP BY 1""",
                              [*params, *names])
            counts[key] = {r["skill"]: r["n"] for r in rows}
        else:
            counts[key] = {}
    skills = []
    for name in names:
        na, nb = counts["a"].get(name, 0), counts["b"].get(name, 0)
        pa, pb = share(na, da) or 0.0, share(nb, db) or 0.0
        gap = 100 * (pa - pb)
        mainly = None
        if gap >= MIN_GAP_PP and (pb == 0 or pa / pb >= DOMINANCE_RATIO):
            mainly = "a"
        elif -gap >= MIN_GAP_PP and (pa == 0 or pb / pa >= DOMINANCE_RATIO):
            mainly = "b"
        skills.append({"skill": name, "a_n": na, "b_n": nb, "a_share": pa, "b_share": pb,
                       "diff_pp": round(gap, 2), "ratio": round(pa / pb, 3) if pb else None, "mainly": mainly})
    skills.sort(key=lambda s: -abs(s["diff_pp"]))

    warnings = []
    for key, seg in (("a", sa), ("b", sb)):
        n = seg["top_skills"]["denominator"]
        if seg["kpis"]["postings"] < MIN_GROUP_POSTINGS or n < MIN_GROUP_POSTINGS:
            warnings.append({"level": "error", "segment": key, "code": "too_few_postings",
                             "text": f"Segment {key.upper()} has {n} postings with skill data "
                                     f"(minimum {MIN_GROUP_POSTINGS}); its ranking is hidden."})
        sn = seg["salary"].get("n") or 0
        if 0 < sn < RELIABLE_SALARY_N:
            warnings.append({"level": "warn", "segment": key, "code": "small_salary_sample",
                             "text": f"Segment {key.upper()} has only {sn} advertised salaries"
                                     + (" — salary hidden." if sn < MIN_SALARY_N else " — treat the median as indicative.")})
        if sn >= MIN_SALARY_N and (seg["salary"].get("currencies") or 0) > 1:
            warnings.append({"level": "info", "segment": key, "code": "mixed_currencies",
                             "text": f"Segment {key.upper()} salaries were converted to USD from "
                                     f"{seg['salary']['currencies']} currencies at fixed approximate rates."})
    ca, wa = _main_cohort(sa)
    cb, wb = _main_cohort(sb)
    if ca and cb and ca != cb and wa >= 0.5 and wb >= 0.5:
        warnings.append({"level": "warn", "segment": None, "code": "different_cohorts",
                         "text": "The segments are dominated by different collection cohorts (2023 archive vs "
                                 "2024–26 collection). Differences may reflect the period and the collection "
                                 "method, not only the market."})
    src_a = {r["key"] for r in sa["sources"] if (r["share"] or 0) >= 0.2}
    src_b = {r["key"] for r in sb["sources"] if (r["share"] or 0) >= 0.2}
    if src_a and src_b and not src_a & src_b:
        warnings.append({"level": "info", "segment": None, "code": "different_sources",
                         "text": "The segments come mostly from different data sources; source coverage "
                                 "(e.g. data-role focus of the Kaggle archive) can drive part of the gap."})
    for key, seg in (("a", sa), ("b", sb)):
        if (seg["salary"].get("n") or 0) < MIN_SALARY_N:
            seg["salary"] = {**seg["salary"], "median": None, "p25": None, "p75": None, "p10": None,
                             "p90": None, "mean": None}
        if seg["top_skills"]["denominator"] < MIN_GROUP_POSTINGS:
            seg["top_skills"]["rows"] = []
    return {"a": sa, "b": sb, "skills": skills, "warnings": warnings,
            "rules": {"dominance_ratio": DOMINANCE_RATIO, "min_gap_pp": MIN_GAP_PP,
                      "min_group": MIN_GROUP_POSTINGS, "min_salary_n": MIN_SALARY_N}}
