"""Human-readable labels, thresholds and small statistics helpers shared by the queries."""
from __future__ import annotations

import math

# Groups smaller than this are not ranked (UC-03 / UC-04 alternative flows).
MIN_GROUP_POSTINGS = 30
# Salary statistics need at least this many advertised salaries to be shown;
# below RELIABLE_SALARY_N they are shown with a low-confidence flag.
MIN_SALARY_N = 10
RELIABLE_SALARY_N = 30

SOURCE_LABELS = {
    "kaggle_2023_international": "Kaggle data jobs 2023 (international)",
    "kaggle_2023_arab_search": "Kaggle data jobs 2023 (Arab search locations)",
    "jooble_careerjet_foreign": "Jooble + Careerjet APIs",
    "all_tech_jobs": "Team API & board collection",
    "startup_jobs": "startup.jobs",
    "remote_boards": "Remote job boards",
    "arab_jobs": "Arab job boards & ArabJobs corpus",
    "cybersecurity_manual": "Manual cybersecurity collection",
}
COHORT_LABELS = {
    "kaggle_2023": "2023 Kaggle archive",
    "collected_2026": "2024–26 API & board collection",
}
COHORT_NOTES = {
    "kaggle_2023": "Google-Jobs postings for data roles, posted Jan–Dec 2023 (Kaggle dataset).",
    "collected_2026": "Postings collected by the team from APIs and job boards, mostly Sep–Oct 2026.",
}
DIMENSION_LABELS = {
    "role_category": "Role", "country": "Country", "region": "Region", "market_type": "Market",
    "seniority": "Seniority", "job_type": "Employment type", "work_mode": "Work mode",
    "source_dataset": "Data source", "cohort": "Collection cohort", "language": "Language",
    "posted_month": "Posting month", "posted_year": "Posting year", "company": "Employer",
    "skill": "Skill", "skill_category": "Skill category",
}


def wilson_lower(k: int, n: int, z: float = 1.96) -> float:
    """Lower bound of the 95% Wilson score interval for a proportion k/n.
    Used to rank skills so a share from a tiny sample does not outrank a
    slightly smaller share from a large one."""
    if n <= 0:
        return 0.0
    p = k / n
    denom = 1 + z * z / n
    centre = p + z * z / (2 * n)
    margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, (centre - margin) / denom)


def share(k, n) -> float | None:
    return round(k / n, 6) if n else None


def salary_confidence(n: int) -> str:
    if n < MIN_SALARY_N:
        return "insufficient"
    return "low" if n < RELIABLE_SALARY_N else "ok"
