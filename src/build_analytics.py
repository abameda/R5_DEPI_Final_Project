"""Processed CSVs  ->  DuckDB analytical store used by the dashboard API.

    python src/build_analytics.py                       # data/processed -> data/analytics/jmi.duckdb
    python src/build_analytics.py --processed data/demo --out data/analytics/demo.duckdb --synthetic

The store adds no new facts. It only:
  * gives every posting a small integer key (`jid`) so skill joins are fast;
  * labels the two collection cohorts (Kaggle 2023 archive vs 2024-26 API/board
    collection) so the dashboard never mixes them silently in time comparisons;
  * splits salaries into `advertised` (the posting's own pay) and `benchmark`
    (a market figure the team attached) so they are never averaged together;
  * flags placeholder employers ('Confidential', job boards) using the same
    list the pipeline uses for deduplication;
  * stores the pipeline statistics (pipeline_stats.json) for the methodology page.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import duckdb

import clean_utils as cu
from pipeline import PLACEHOLDER_COMPANIES

ROOT = Path(__file__).resolve().parents[1]

COHORT_SQL = """CASE WHEN source_dataset LIKE 'kaggle_2023%' THEN 'kaggle_2023' ELSE 'collected_2026' END"""


def build(processed: Path, out: Path, stats_file: Path | None, synthetic: bool) -> dict:
    t0 = time.perf_counter()
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".building")
    tmp.unlink(missing_ok=True)
    con = duckdb.connect(str(tmp))
    csv = lambda name: str(processed / name).replace("'", "''")  # noqa: E731

    con.execute(f"CREATE TEMP TABLE raw_jobs AS SELECT * FROM read_csv('{csv('jobs_clean.csv')}', header=true, sample_size=-1)")
    # placeholder employer keys, normalized exactly like the pipeline's match_key()
    companies = con.execute("SELECT DISTINCT company FROM raw_jobs WHERE company IS NOT NULL").df()["company"]
    placeholder = companies[cu.match_key(companies).isin(PLACEHOLDER_COMPANIES)]
    con.execute("CREATE TEMP TABLE placeholder_company(company VARCHAR)")
    if len(placeholder):
        con.executemany("INSERT INTO placeholder_company VALUES (?)", [[c] for c in placeholder])

    con.execute(f"""
        CREATE TABLE jobs AS
        SELECT
            CAST(row_number() OVER (ORDER BY job_id) AS INTEGER) AS jid,
            j.* EXCLUDE (salary_is_estimate),
            {COHORT_SQL} AS cohort,
            CAST(date_trunc('month', posted_date) AS DATE) AS posted_month,
            CASE
                WHEN salary_usd_annual IS NOT NULL AND salary_is_estimate THEN 'benchmark'
                WHEN salary_usd_annual IS NOT NULL THEN 'advertised'
                WHEN salary_min IS NOT NULL AND salary_is_estimate THEN 'benchmark_unusable'
                WHEN salary_min IS NOT NULL THEN 'advertised_unusable'
                ELSE 'none'
            END AS salary_kind,
            (pc.company IS NOT NULL) AS company_is_placeholder
        FROM raw_jobs j LEFT JOIN placeholder_company pc USING (company)
        ORDER BY market_type, country, role_category
    """)
    con.execute(f"""
        CREATE TABLE skills AS
        SELECT skill, skill_key, category, category_source, CAST(is_technical AS BOOLEAN) AS is_technical
        FROM read_csv('{csv('skills_dim.csv')}', header=true)
    """)
    con.execute(f"""
        CREATE TABLE job_skills AS
        SELECT j.jid, s.skill, CAST(s.is_observed AS BOOLEAN) AS is_observed
        FROM read_csv('{csv('job_skills.csv')}', header=true) s
        JOIN jobs j USING (job_id)
        ORDER BY j.jid
    """)
    # per-skill totals (unfiltered) used for search / autocomplete ranking
    con.execute("""
        CREATE TABLE skill_totals AS
        SELECT skill, count(*) AS postings, count(*) FILTER (WHERE is_observed) AS observed_postings
        FROM job_skills GROUP BY skill
    """)

    stats = json.loads(stats_file.read_text(encoding="utf-8")) if stats_file and stats_file.exists() else {}
    meta = {
        "dataset_kind": "synthetic" if synthetic else "real",
        "built_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "processed_dir": str(processed),
        "pipeline_stats": stats,
    }
    con.execute("CREATE TABLE meta(key VARCHAR PRIMARY KEY, value JSON)")
    con.executemany("INSERT INTO meta VALUES (?, ?)", [[k, json.dumps(v)] for k, v in meta.items()])

    counts = {t: con.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in ("jobs", "job_skills", "skills")}
    orphans = con.execute("SELECT count(*) FROM job_skills s ANTI JOIN skills d USING (skill)").fetchone()[0]
    if orphans:
        raise ValueError(f"{orphans} job_skills rows have no entry in skills_dim.csv")
    con.execute("CHECKPOINT")
    con.close()
    out.unlink(missing_ok=True)
    tmp.rename(out)
    counts["seconds"] = round(time.perf_counter() - t0, 1)
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the DuckDB analytical store for the dashboard.")
    parser.add_argument("--processed", type=Path, default=ROOT / "data" / "processed")
    parser.add_argument("--stats", type=Path, default=None,
                        help="pipeline_stats.json (default: <processed>/pipeline_stats.json, then reports/)")
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "analytics" / "jmi.duckdb")
    parser.add_argument("--synthetic", action="store_true", help="mark the store as synthetic demo data")
    args = parser.parse_args()
    stats = args.stats or next((p for p in (args.processed / "pipeline_stats.json",
                                            ROOT / "reports" / "pipeline_stats.json") if p.exists()), None)
    print(build(args.processed, args.out, stats, args.synthetic))


if __name__ == "__main__":
    main()
