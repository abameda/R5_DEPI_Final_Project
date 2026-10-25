"""Data Quality & Methodology Center: everything is computed from the store
itself, plus the pipeline's own stage counts (pipeline_stats.json)."""
from __future__ import annotations

from ..db import Store
from ..labels import COHORT_LABELS, COHORT_NOTES, SOURCE_LABELS, share

KEY_FIELDS = ["company", "country", "city", "description", "skills", "posted_date", "url", "salary_usd_annual"]


def quality(store: Store) -> dict:
    missing_sql = ", ".join(f"count(*) FILTER (WHERE {c} IS NULL) AS {c}" for c in KEY_FIELDS)
    per_source = store.rows(f"""
        SELECT source_dataset AS source, count(*) AS postings,
               sum(duplicate_count) AS appearances,
               count(*) FILTER (WHERE duplicate_count > 1) AS merged_duplicates,
               min(posted_date) AS first_posted, max(posted_date) AS last_posted,
               count(*) FILTER (WHERE salary_kind = 'advertised') AS advertised_salary,
               count(*) FILTER (WHERE salary_kind = 'benchmark') AS benchmark_salary,
               count(*) FILTER (WHERE skills_enriched) AS skills_enriched,
               count(DISTINCT country) AS countries,
               {missing_sql}
        FROM jobs GROUP BY 1 ORDER BY postings DESC""")
    provenance = {r["source"]: r for r in store.rows("""
        SELECT j.source_dataset AS source, count(*) AS skill_rows, count(*) FILTER (WHERE s.is_observed) AS observed
        FROM job_skills s JOIN jobs j USING (jid) GROUP BY 1""")}
    for r in per_source:
        r["label"] = SOURCE_LABELS.get(r["source"], r["source"])
        r["appearances"] = int(r["appearances"] or 0)
        r["missing"] = {c: share(r.pop(c), r["postings"]) for c in KEY_FIELDS}
        p = provenance.get(r["source"], {"skill_rows": 0, "observed": 0})
        r["skill_rows"], r["observed_skill_rows"] = p["skill_rows"], p["observed"]
        r["observed_share"] = share(p["observed"], p["skill_rows"])
    totals = store.one(f"""
        SELECT count(*) AS postings, sum(duplicate_count) AS appearances,
               count(*) FILTER (WHERE duplicate_count > 1) AS merged_duplicates,
               count(*) FILTER (WHERE company_is_placeholder) AS placeholder_company_postings,
               count(DISTINCT company) FILTER (WHERE company_is_placeholder) AS placeholder_companies,
               {missing_sql}
        FROM jobs""")
    totals["appearances"] = int(totals["appearances"] or 0)
    totals["missing"] = {c: share(totals.pop(c), totals["postings"]) for c in KEY_FIELDS}
    skill_rows = store.one("""SELECT count(*) AS rows, count(*) FILTER (WHERE is_observed) AS observed,
                              count(DISTINCT skill) AS skills FROM job_skills""")
    taxonomy = store.rows("""
        SELECT k.category_source AS source, count(DISTINCT k.skill) AS skills, count(*) AS mentions
        FROM job_skills s JOIN skills k USING (skill) GROUP BY 1 ORDER BY mentions DESC""")
    salary = store.rows("""SELECT source_dataset AS source, salary_kind AS kind, count(*) AS n
                           FROM jobs GROUP BY ALL ORDER BY 1, n DESC""")
    language = store.rows("SELECT language AS key, count(*) AS n FROM jobs GROUP BY 1 ORDER BY n DESC")
    years = store.rows("SELECT posted_year AS key, cohort, count(*) AS n FROM jobs GROUP BY ALL ORDER BY 1")
    sudan_now = store.rows("""SELECT coalesce(country, '(no country: remote / unknown)') AS key, count(*) AS n
        FROM jobs WHERE source_dataset = 'kaggle_2023_arab_search' AND search_keyword = 'Sudan'
        GROUP BY 1 ORDER BY n DESC""")
    stats = store.meta.get("pipeline_stats", {})
    return {
        "dataset_kind": store.meta.get("dataset_kind"),
        "built_at": store.meta.get("built_at"),
        "pipeline": stats,
        "totals": totals,
        "per_source": per_source,
        "skill_provenance": {**skill_rows, "observed_share": share(skill_rows["observed"], skill_rows["rows"])},
        "taxonomy": taxonomy,
        "salary_kinds": salary,
        "language": language,
        "posting_years": years,
        "sudan_correction": {
            "before": stats.get("sudan_search_location_rows"),
            "after_dedup": sudan_now,
        },
        "cohorts": [{"key": k, "label": v, "note": COHORT_NOTES[k]} for k, v in COHORT_LABELS.items()],
    }
