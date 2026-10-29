"""Skill intelligence: rankings, role/market matrices, co-occurrence, skill
profiles and the career skill-gap analyzer.

Denominator rule used everywhere: a skill's *share* is the number of postings
that list it divided by the number of postings that list at least one skill
(in the same population and the same provenance mode). Postings without any
skill data are excluded from the denominator, never counted as "skill absent".
"""
from __future__ import annotations

import math

from fastapi import HTTPException

from ..db import Store
from ..filters import Filters
from ..labels import MIN_GROUP_POSTINGS, MIN_SALARY_N, salary_confidence, share, wilson_lower
from .market import BREAKDOWN_DIMS, skilled_col


def skill_denominator(store: Store, f: Filters) -> int:
    cte, params = f.cte()
    return store.scalar(f"{cte} SELECT count(*) FROM f WHERE {skilled_col(f)} > 0", params) or 0


def top_skills(store: Store, f: Filters, limit: int = 25, category: str | None = None,
               technical: bool | None = None) -> dict:
    cte, params = f.cte()
    cond, extra = "", []
    if category:
        cond += " AND k.category = ?"
        extra.append(category)
    if technical is not None:
        cond += " AND k.is_technical = ?"
        extra.append(technical)
    rows = store.rows(f"""{cte}
        SELECT s.skill, k.category, k.is_technical, count(*) AS postings,
               count(*) FILTER (WHERE s.is_observed) AS observed
        FROM job_skills s JOIN f USING (jid) JOIN skills k USING (skill)
        WHERE TRUE {f.skill_condition()} {cond}
        GROUP BY ALL ORDER BY postings DESC, s.skill LIMIT ?""", [*params, *extra, limit])
    denom = skill_denominator(store, f)
    for r in rows:
        r["share"] = share(r["postings"], denom)
        r["observed_share"] = share(r["observed"], denom)
        r["added"] = r["postings"] - r["observed"]
    return {"denominator": denom, "provenance": f.provenance, "rows": rows}


def skill_categories(store: Store, f: Filters) -> dict:
    cte, params = f.cte()
    rows = store.rows(f"""{cte}
        SELECT k.category, any_value(k.is_technical) AS is_technical,
               count(DISTINCT s.jid) AS postings, count(*) AS mentions, count(DISTINCT s.skill) AS skills
        FROM job_skills s JOIN f USING (jid) JOIN skills k USING (skill)
        WHERE TRUE {f.skill_condition()} GROUP BY 1 ORDER BY postings DESC""", params)
    denom = skill_denominator(store, f)
    total_mentions = sum(r["mentions"] for r in rows)
    for r in rows:
        r["share"] = share(r["postings"], denom)
        r["mention_share"] = share(r["mentions"], total_mentions)
    return {"denominator": denom, "rows": rows}


def by_dimension(store: Store, f: Filters, dim: str, groups_limit: int, skills_limit: int,
                 skills: list[str] | None = None) -> dict:
    """Skill share within each group of a posting dimension (role, country, ...)."""
    if dim not in BREAKDOWN_DIMS:
        raise HTTPException(422, f"Unsupported dimension: {dim}")
    cte, params = f.cte()
    sk = skilled_col(f)
    groups = store.rows(f"""{cte}
        SELECT {dim} AS key, count(*) FILTER (WHERE {sk} > 0) AS denominator, count(*) AS postings
        FROM f WHERE {dim} IS NOT NULL GROUP BY 1 ORDER BY denominator DESC, key LIMIT ?""",
                        [*params, groups_limit])
    if not skills:
        skills = [r["skill"] for r in top_skills(store, f, limit=skills_limit)["rows"]]
    if not groups or not skills:
        return {"dimension": dim, "groups": groups, "skills": skills, "cells": []}
    keys = [g["key"] for g in groups]
    cells = store.rows(f"""{cte}
        SELECT f.{dim} AS key, s.skill, count(*) AS n
        FROM job_skills s JOIN f USING (jid)
        WHERE f.{dim} IN ({', '.join('?' * len(keys))}) AND s.skill IN ({', '.join('?' * len(skills))})
              {f.skill_condition()}
        GROUP BY ALL""", [*params, *keys, *skills])
    denom = {g["key"]: g["denominator"] for g in groups}
    for g in groups:
        g["small_sample"] = g["denominator"] < MIN_GROUP_POSTINGS
    for c in cells:
        c["share"] = share(c["n"], denom[c["key"]])
    return {"dimension": dim, "groups": groups, "skills": skills, "cells": cells,
            "min_group": MIN_GROUP_POSTINGS}


def cooccurrence(store: Store, f: Filters, limit: int = 20) -> dict:
    """Pairs among the `limit` most requested skills.
    jaccard = both / either;  lift = P(a and b) / (P(a) P(b));  p_b_given_a = both / a."""
    top = top_skills(store, f, limit=limit)
    nodes = top["rows"]
    n = top["denominator"]
    if len(nodes) < 2 or not n:
        return {"denominator": n, "nodes": nodes, "links": []}
    names = [r["skill"] for r in nodes]
    cte, params = f.cte()
    pairs = store.rows(f"""{cte},
        s AS (SELECT s.jid, s.skill FROM job_skills s JOIN f USING (jid)
              WHERE s.skill IN ({', '.join('?' * len(names))}) {f.skill_condition()})
        SELECT a.skill AS a, b.skill AS b, count(*) AS together
        FROM s a JOIN s b ON a.jid = b.jid AND a.skill < b.skill GROUP BY ALL""", [*params, *names])
    counts = {r["skill"]: r["postings"] for r in nodes}
    links = []
    for p in pairs:
        na, nb, both = counts[p["a"]], counts[p["b"]], p["together"]
        links.append({**p, "jaccard": round(both / (na + nb - both), 4),
                      "lift": round(both * n / (na * nb), 3) if na and nb else None,
                      "p_b_given_a": round(both / na, 4), "p_a_given_b": round(both / nb, 4)})
    links.sort(key=lambda link: -link["together"])
    return {"denominator": n, "nodes": nodes, "links": links}


def skill_detail(store: Store, f: Filters, skill: str) -> dict:
    meta = store.one("SELECT skill, category, category_source, is_technical FROM skills WHERE skill = ?", [skill])
    if not meta:
        raise HTTPException(404, f"Unknown skill: {skill}")
    cte, params = f.cte()
    cond = f.skill_condition()
    sk = skilled_col(f)
    denom = skill_denominator(store, f)
    has = f"jid IN (SELECT jid FROM job_skills s WHERE s.skill = ? {cond})"
    head = store.one(f"""{cte}
        SELECT count(*) FILTER (WHERE {has}) AS postings,
               count(*) FILTER (WHERE jid IN (SELECT jid FROM job_skills s WHERE s.skill = ? AND s.is_observed))
                   AS observed_postings
        FROM f""", [*params, skill, skill])

    def by(dim: str, limit: int) -> list[dict]:
        rows = store.rows(f"""{cte}
            SELECT {dim} AS key, count(*) FILTER (WHERE {sk} > 0) AS denominator,
                   count(*) FILTER (WHERE {has}) AS n
            FROM f WHERE {dim} IS NOT NULL GROUP BY 1 HAVING denominator >= ?
            ORDER BY n DESC, key LIMIT ?""", [*params, skill, MIN_GROUP_POSTINGS, limit])
        for r in rows:
            r["share"] = share(r["n"], r["denominator"])
        return rows

    co = store.rows(f"""{cte},
        mine AS (SELECT s.jid FROM job_skills s JOIN f USING (jid) WHERE s.skill = ? {cond}),
        tot AS (SELECT s.skill, count(*) AS n FROM job_skills s JOIN f USING (jid) WHERE TRUE {cond} GROUP BY 1)
        SELECT s.skill, count(*) AS together, any_value(tot.n) AS total
        FROM job_skills s JOIN mine USING (jid) JOIN tot USING (skill)
        WHERE s.skill <> ? {cond} GROUP BY 1 ORDER BY together DESC LIMIT 15""", [*params, skill, skill])
    n_skill = head["postings"] or 0
    for c in co:
        c["p_given_skill"] = share(c["together"], n_skill)
        c["lift"] = round(c["together"] * denom / (n_skill * c["total"]), 3) if n_skill and c["total"] else None
    employers = store.rows(f"""{cte} SELECT company AS key, count(*) AS n FROM f
        WHERE {has} AND NOT company_is_placeholder AND company IS NOT NULL
        GROUP BY 1 ORDER BY n DESC, key LIMIT 10""", [*params, skill])
    salary = store.rows(f"""{cte}
        SELECT ({has}) AS with_skill, count(*) AS n, median(salary_usd_annual) AS median,
               quantile_cont(salary_usd_annual, 0.25) AS p25, quantile_cont(salary_usd_annual, 0.75) AS p75
        FROM f WHERE salary_kind = 'advertised' AND {sk} > 0 GROUP BY 1""", [*params, skill])
    for s in salary:
        s["confidence"] = salary_confidence(s["n"])
        if s["n"] < MIN_SALARY_N:
            s["median"] = s["p25"] = s["p75"] = None
    from .trends import skill_trend
    return {
        **meta,
        "denominator": denom,
        "postings": n_skill,
        "share": share(n_skill, denom),
        "observed_postings": head["observed_postings"],
        "by_role": by("role_category", 17),
        "by_country": by("country", 12),
        "by_seniority": by("seniority", 6),
        "by_market": by("market_type", 4),
        "co_skills": co,
        "employers": employers,
        "salary": salary,
        "trend": skill_trend(store, f, [skill]),
    }


# ---------------------------------------------------------------------------
# Career path & skill gap analyzer
# ---------------------------------------------------------------------------
TOP_K = 15


def _role_vectors(store: Store, f: Filters, skills: list[str]) -> dict[str, dict]:
    """Skill-share vector per role category (within the filters, ignoring the role filter)."""
    cte, params = f.cte()
    sk = skilled_col(f)
    dens = {r["role_category"]: r["d"] for r in store.rows(f"""{cte}
        SELECT role_category, count(*) FILTER (WHERE {sk} > 0) AS d FROM f GROUP BY 1""", params)}
    cells = store.rows(f"""{cte}
        SELECT f.role_category, s.skill, count(*) AS n FROM job_skills s JOIN f USING (jid)
        WHERE s.skill IN ({', '.join('?' * len(skills))}) {f.skill_condition()} GROUP BY ALL""",
                       [*params, *skills])
    vec = {r: {"denominator": d, "shares": {}} for r, d in dens.items() if d}
    for c in cells:
        if c["role_category"] in vec:
            vec[c["role_category"]]["shares"][c["skill"]] = c["n"] / vec[c["role_category"]]["denominator"]
    return vec


def _cosine(a: dict, b: dict) -> float:
    dot = sum(v * b.get(k, 0) for k, v in a.items())
    na, nb = math.sqrt(sum(v * v for v in a.values())), math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def career_gap(store: Store, f: Filters, role: str, have: list[str]) -> dict:
    if role not in store.domains["role_category"]:
        raise HTTPException(422, f"Unknown role: {role}")
    have_set = set(have)
    target = f.model_copy(update={"role": [role]})
    ranked = top_skills(store, target, limit=40)
    n = ranked["denominator"]
    result = {"role": role, "denominator": n, "have": sorted(have_set), "min_group": MIN_GROUP_POSTINGS,
              "provenance": f.provenance}
    if n < MIN_GROUP_POSTINGS:
        result.update(status="too_few_postings", skills=[], priorities=[], alignment=None,
                      related_roles=[], postings=[])
        return result

    skills = ranked["rows"]
    for s in skills:
        s["have"] = s["skill"] in have_set
        s["wilson_lower"] = round(wilson_lower(s["postings"], n), 4)
    top = skills[:TOP_K]
    total_weight = sum(s["share"] for s in top)
    alignment = sum(s["share"] for s in top if s["have"]) / total_weight if total_weight else 0.0
    priorities = sorted((s for s in skills if not s["have"]), key=lambda s: -s["wilson_lower"])[:10]

    # Posting-level match: what fraction of each posting's listed skills the user has.
    cte, params = target.cte()
    match_rows = []
    if have_set:
        hv = sorted(have_set)
        match_rows = store.rows(f"""{cte},
            m AS (SELECT s.jid, count(*) AS listed,
                         count(*) FILTER (WHERE s.skill IN ({', '.join('?' * len(hv))})) AS matched
                  FROM job_skills s JOIN f USING (jid) WHERE TRUE {target.skill_condition()} GROUP BY 1)
            SELECT count(*) AS postings,
                   count(*) FILTER (WHERE matched = listed) AS full_match,
                   count(*) FILTER (WHERE matched * 2 >= listed) AS half_match,
                   count(*) FILTER (WHERE matched > 0) AS any_match
            FROM m""", [*params, *hv])
    match = match_rows[0] if match_rows else None

    # Related roles: cosine similarity of skill-share vectors over the union of
    # every role's top skills; plus how well the user's skills cover each role.
    base = f.without("role")
    union = [r["skill"] for r in top_skills(store, base, limit=60)["rows"]]
    vectors = _role_vectors(store, base, union)
    tv = vectors.get(role, {"shares": {}})["shares"]
    related = []
    for r, v in vectors.items():
        if r == role or v["denominator"] < MIN_GROUP_POSTINGS:
            continue
        top_r = sorted(v["shares"].items(), key=lambda kv: -kv[1])[:TOP_K]
        w = sum(s for _, s in top_r)
        related.append({"role": r, "similarity": round(_cosine(tv, v["shares"]), 3),
                        "postings_with_skills": v["denominator"],
                        "alignment": round(sum(s for k, s in top_r if k in have_set) / w, 3) if w else None,
                        "top_skills": [k for k, _ in top_r[:5]]})
    related.sort(key=lambda r: -r["similarity"])

    # Example postings: most of your skills first, then the larger share of the posting's list, newest first.
    hv = sorted(have_set) or [""]
    postings = store.rows(f"""{cte},
        m AS (SELECT s.jid, count(*) FILTER (WHERE s.skill IN ({', '.join('?' * len(hv))})) AS matched,
                     count(*) AS listed,
                     list(s.skill ORDER BY s.skill) FILTER (WHERE s.skill NOT IN ({', '.join('?' * len(hv))}))
                         AS missing
              FROM job_skills s JOIN f USING (jid) WHERE TRUE {target.skill_condition()} GROUP BY 1)
        SELECT f.job_id, f.title, f.company, f.country, f.market_type, f.posted_date, f.url, f.source_dataset,
               m.matched, m.listed, m.missing
        FROM m JOIN f USING (jid) ORDER BY m.matched DESC, m.matched * 1.0 / m.listed DESC, f.posted_date DESC NULLS LAST
        LIMIT 8""", [*params, *hv, *hv])

    result.update(status="ok", skills=skills, priorities=priorities,
                  alignment={"score": round(alignment, 4), "top_k": TOP_K,
                             "matched_top": [s["skill"] for s in top if s["have"]]},
                  posting_match=match, related_roles=related[:8], postings=postings)
    return result
