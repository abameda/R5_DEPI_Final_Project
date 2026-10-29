"""Role roadmaps: a role's requested skills ordered into Foundations -> Core -> Stand out.

Foundations are asked for in most postings, Core in a solid minority, and Stand out are
niche skills whose postings pay more than the role does *within the same market* (salaries
differ too much between markets for a pooled comparison to mean anything).
"""
from __future__ import annotations

from fastapi import HTTPException

from ..db import Store
from ..filters import Filters
from ..labels import MIN_GROUP_POSTINGS, MIN_SALARY_N, RELIABLE_SALARY_N, wilson_lower
from .market import skilled_col
from .skills import top_skills

FOUNDATION_SHARE = 0.25
FOUNDATION_MIN = 3
CORE_SHARE = 0.05
CORE_MAX = 8
STAND_OUT_MAX = 6

# Word-matching noise that must not become a step on the path (postings sampled 2026-10-29).
# "Flow" and "CAN" are English words everywhere except CAN bus in Embedded & Hardware. "Go" is a
# real language for Backend/DevOps, so it is only dropped where the sampled postings use the verb.
EXCLUDE: dict[str, frozenset[str]] = {
    "*": frozenset({"Flow", "CAN"}),
    "Data Analysis & BI": frozenset({"Go"}),
    "Data Engineering": frozenset({"Go"}),
    "Data Science & AI": frozenset({"Go"}),
    "Product & Project": frozenset({"Go"}),
    "Mobile": frozenset({"Go"}),
    "Design & UX": frozenset({"Go"}),
}
KEEP: dict[str, frozenset[str]] = {"Embedded & Hardware": frozenset({"CAN"})}


def excluded(role: str) -> frozenset[str]:
    return (EXCLUDE["*"] - KEEP.get(role, frozenset())) | EXCLUDE.get(role, frozenset())


def assign_stages(skills: list[dict]) -> dict[str, list[dict]]:
    """Split ranked skill rows (`skill`, `share`, `wilson_lower`) into disjoint stages.
    `niche` is the pool Stand out is picked from; Core overflow is dropped, not moved there."""
    ranked = sorted(skills, key=lambda s: -s["share"])
    foundations = [s for s in ranked if s["share"] >= FOUNDATION_SHARE]
    if len(foundations) < FOUNDATION_MIN:
        foundations = ranked[:FOUNDATION_MIN]
    taken = {s["skill"] for s in foundations}
    rest = [s for s in ranked if s["skill"] not in taken]
    core = sorted((s for s in rest if s["share"] >= CORE_SHARE), key=lambda s: -s["wilson_lower"])[:CORE_MAX]
    niche = [s for s in rest if s["share"] < CORE_SHARE]
    return {"foundations": foundations, "core": core, "niche": niche}


def market_premium(cells: list[dict]) -> dict | None:
    """Pay premium of a skill over its role, compared market by market.
    premium = sum((skill_median - role_median) / role_median * skill_n) / sum(skill_n) over
    markets where both sides have at least MIN_SALARY_N salaries. None unless those markets
    hold RELIABLE_SALARY_N salaries and the premium is positive."""
    usable = [c for c in cells if c["role_n"] >= MIN_SALARY_N and c["skill_n"] >= MIN_SALARY_N and c["role_median"]]
    n = sum(c["skill_n"] for c in usable)
    if n < RELIABLE_SALARY_N:
        return None
    premium = sum((c["skill_median"] - c["role_median"]) / c["role_median"] * c["skill_n"] for c in usable) / n
    if premium <= 0:
        return None
    return {"premium": round(premium, 4), "salary_n": n, "markets": sorted(c["market"] for c in usable)}


def _stand_out(store: Store, target: Filters, niche: list[dict]) -> list[dict]:
    """Niche skills with a positive within-market pay premium, best first. Salary counts are
    distinct (employer, salary) pairs, so one employer reposting the same job cannot clear the
    reliability thresholds alone."""
    if not niche:
        return []
    cte, params = target.cte()
    sk = skilled_col(target)
    names = [s["skill"] for s in niche]
    role = {r["market"]: r for r in store.rows(f"""{cte}
        SELECT market_type AS market, median(salary_usd_annual) AS median, count(DISTINCT (company, salary_usd_annual)) AS n
        FROM f WHERE salary_kind = 'advertised' AND {sk} > 0 GROUP BY 1""", params)}
    cells = store.rows(f"""{cte}
        SELECT s.skill, f.market_type AS market, median(f.salary_usd_annual) AS median,
               count(DISTINCT (f.company, f.salary_usd_annual)) AS n
        FROM job_skills s JOIN f USING (jid)
        WHERE f.salary_kind = 'advertised' AND s.skill IN ({', '.join('?' * len(names))}) {target.skill_condition()}
        GROUP BY ALL""", [*params, *names])
    by_skill: dict[str, list[dict]] = {}
    for c in cells:
        r = role.get(c["market"])
        if r:
            by_skill.setdefault(c["skill"], []).append({"market": c["market"], "role_median": r["median"], "role_n": r["n"],
                                                        "skill_median": c["median"], "skill_n": c["n"]})
    picked = []
    for s in niche:
        p = market_premium(by_skill.get(s["skill"], []))
        if p:
            picked.append({**s, **p})
    picked.sort(key=lambda s: -s["premium"])
    return picked[:STAND_OUT_MAX]


def career_roadmap(store: Store, f: Filters, role: str, have: list[str]) -> dict:
    if role not in store.domains["role_category"]:
        raise HTTPException(422, f"Unknown role: {role}")
    target = f.model_copy(update={"role": [role]})
    ranked = top_skills(store, target, limit=40)
    n = ranked["denominator"]
    result = {"role": role, "denominator": n, "provenance": f.provenance, "min_group": MIN_GROUP_POSTINGS}
    if n < MIN_GROUP_POSTINGS:
        return {**result, "status": "too_few_postings", "stages": []}
    drop = excluded(role)
    have_set = set(have)
    skills = [{**s, "have": s["skill"] in have_set, "wilson_lower": round(wilson_lower(s["postings"], n), 4)}
              for s in ranked["rows"] if s["skill"] not in drop]
    stages = assign_stages(skills)
    out = [{"key": "foundations", "skills": stages["foundations"]}, {"key": "core", "skills": stages["core"]}]
    stand_out = _stand_out(store, target, stages["niche"])
    if stand_out:
        out.append({"key": "stand_out", "skills": stand_out})
    return {**result, "status": "ok", "stages": out}
