"""Generate a SMALL, SYNTHETIC dataset with the same schema as the pipeline output.

    python scripts/make_demo_data.py            # -> data/demo/ + data/analytics/demo.duckdb

Why: the real raw/processed data cannot be committed or redistributed (NFR-08),
but tests and front-end development need a store to run against. Every value
here is randomly generated: employers are called "Synthetic Employer NN", there
are no URLs, and the store is flagged `dataset_kind = synthetic` so the
dashboard shows a permanent "synthetic demo data" banner. Never cite numbers
from it.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
import skill_taxonomy as tax  # noqa: E402
from pipeline import FINAL_COLUMNS  # noqa: E402

ROLES = {  # role -> (weight, skills with probabilities)
    "Data Analysis & BI": (0.30, {"SQL": .7, "Excel": .5, "Power BI": .4, "Tableau": .35, "Python": .4,
                                  "Communication": .15}),
    "Data Engineering": (0.25, {"SQL": .7, "Python": .65, "Spark": .4, "AWS": .35, "Airflow": .25,
                                "Kafka": .2, "Docker": .15}),
    "Data Science & AI": (0.20, {"Python": .85, "SQL": .5, "Machine Learning": .4, "PyTorch": .2,
                                 "TensorFlow": .2, "R": .25}),
    "Backend": (0.10, {"Java": .4, "Python": .35, "SQL": .4, "Docker": .3, "Kubernetes": .2, "REST API": .3}),
    "Cybersecurity": (0.08, {"SIEM": .4, "Network Security": .35, "Linux": .3, "Python": .2,
                             "Incident Response": .3}),
    "Mobile": (0.07, {"Kotlin": .45, "Swift": .4, "Flutter": .3, "Git": .3}),
}
COUNTRIES = {  # country -> (weight, region, currency)
    "United States": (0.32, "Non-Arab", "USD"), "United Kingdom": (0.1, "Non-Arab", "GBP"),
    "Germany": (0.08, "Non-Arab", "EUR"), "India": (0.1, "Non-Arab", "INR"),
    "Egypt": (0.14, "Arab", "EGP"), "Saudi Arabia": (0.1, "Arab", "SAR"),
    "United Arab Emirates": (0.1, "Arab", "AED"), None: (0.06, "Worldwide / Unknown", "USD"),
}
SENIORITY = ["Not specified", "Senior", "Junior", "Lead / Principal", "Intern", "Manager / Director"]
SOURCES = {"kaggle_2023_international": 0.55, "kaggle_2023_arab_search": 0.15, "jooble_careerjet_foreign": 0.15,
           "all_tech_jobs": 0.1, "arab_jobs": 0.05}
USD = {"USD": 1, "GBP": 1.3, "EUR": 1.1, "INR": 0.0115, "EGP": 1 / 48.5, "SAR": 1 / 3.75, "AED": 1 / 3.6725}
BASE_USD = {"United States": 120_000, "United Kingdom": 75_000, "Germany": 70_000, "India": 20_000,
            "Egypt": 9_000, "Saudi Arabia": 45_000, "United Arab Emirates": 55_000, None: 90_000}


def generate(n: int, seed: int) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    rng = np.random.default_rng(seed)
    roles = rng.choice(list(ROLES), n, p=[w for w, _ in ROLES.values()])
    countries = rng.choice(len(COUNTRIES), n, p=[w for w, *_ in COUNTRIES.values()])
    country_names = list(COUNTRIES)
    sources = rng.choice(list(SOURCES), n, p=list(SOURCES.values()))
    rows, skill_rows = [], []
    for i in range(n):
        role, country = roles[i], country_names[countries[i]]
        _, region, currency = COUNTRIES[country]
        source = sources[i]
        kaggle = source.startswith("kaggle_2023")
        date = (pd.Timestamp("2023-01-01") + pd.Timedelta(days=int(rng.integers(0, 365))) if kaggle
                else pd.Timestamp("2026-09-01") + pd.Timedelta(days=int(rng.integers(0, 47))))
        remote = rng.random() < 0.1
        seniority = SENIORITY[min(int(rng.exponential(1.2)), 5)]
        market = "Remote" if remote else ("Unknown" if country is None else ("Arab" if region == "Arab"
                                                                              else "International"))
        skills = [s for s, p in ROLES[role][1].items() if rng.random() < p]
        observed = [s for s in skills if kaggle and source.endswith("international") or rng.random() < 0.6]
        job_id = f"demo{i:06d}"
        salary_kind = rng.random()
        smin = smax = usd = np.nan
        cur = per = None
        estimate = False
        if salary_kind < 0.25 or (salary_kind < 0.35 and region == "Arab"):
            per = "year" if currency in ("USD", "GBP", "EUR") else "month"
            usd = round(BASE_USD[country] * rng.lognormal(0, 0.25) * (1.3 if seniority == "Senior" else 1))
            local = usd / USD[currency] / (12 if per == "month" else 1)
            smin, smax, cur = round(local * 0.9), round(local * 1.1), currency
            estimate = salary_kind >= 0.25
        rows.append({
            "job_id": job_id, "title": f"{seniority + ' ' if seniority in ('Senior', 'Junior') else ''}"
                                       f"{role.split(' &')[0]} specialist",
            "company": f"Synthetic Employer {int(rng.integers(1, 120)):02d}", "role_category": role,
            "seniority": seniority, "country": country, "city": None, "location": country or "Remote",
            "region": region, "market_type": market, "work_mode": "Remote" if remote else "On-site",
            "job_type": "Full-time" if rng.random() < 0.9 else "Contract", "language": "en",
            "description": "SYNTHETIC posting generated for tests — not real data.",
            "description_length": 54, "skills": "; ".join(skills) or None, "skills_count": len(skills),
            "skills_observed_count": len(observed), "skills_enriched": len(observed) < len(skills),
            "salary_min": smin, "salary_max": smax, "salary_currency": cur, "salary_period": per,
            "salary_usd_annual": usd, "salary_is_estimate": estimate,
            "posted_date": date.date(), "posted_year": date.year, "source_dataset": source,
            "source_platform": "synthetic", "sources": "synthetic", "duplicate_count": int(rng.integers(1, 3)),
            "url": None, "search_keyword": None,
        })
        skill_rows += [{"job_id": job_id, "skill": s, "is_observed": s in observed} for s in skills]
    jobs = pd.DataFrame(rows)[FINAL_COLUMNS]
    long = pd.DataFrame(skill_rows)
    keys = {s: s.lower() for s in long["skill"].unique()}
    cats = {s: tax.skill_category(k) for s, k in keys.items()}
    dim = pd.DataFrame({"skill": list(keys), "skill_key": list(keys.values()),
                        "category": [cats[s][0] for s in keys], "category_source": [cats[s][1] for s in keys]})
    dim["is_technical"] = dim["category"].map(tax.is_technical)
    stats = {"generated_at": "synthetic", "stages": [{"stage": "1. raw rows loaded (all sources)", "rows": n},
                                                     {"stage": "7b. after removing near-duplicates", "rows": n}],
             "dropped": {}, "raw_rows_by_source": jobs["source_dataset"].value_counts().to_dict(),
             "sudan_search_location_rows": None, "runtime_seconds": 0}
    return jobs, long, dim, stats


def write(out: Path, n: int = 4000, seed: int = 7) -> None:
    jobs, long, dim, stats = generate(n, seed)
    out.mkdir(parents=True, exist_ok=True)
    jobs.to_csv(out / "jobs_clean.csv", index=False)
    long.to_csv(out / "job_skills.csv", index=False)
    dim.to_csv(out / "skills_dim.csv", index=False)
    (out / "pipeline_stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "demo")
    parser.add_argument("--db", type=Path, default=ROOT / "data" / "analytics" / "demo.duckdb")
    parser.add_argument("--rows", type=int, default=4000)
    args = parser.parse_args()
    write(args.out, args.rows)
    from build_analytics import build
    print(build(args.out, args.db, args.out / "pipeline_stats.json", synthetic=True))
    print(f"Synthetic store ready. Run the API with:  JMI_DB={args.db} uvicorn api.main:app")
