"""One loader per raw source (user story US-11).

Each loader reads ONE raw file and returns a DataFrame with the same
"staging" columns (STAGING_COLUMNS). Nothing is cleaned here except what is
specific to that source (e.g. unpacking the JSON-like company field of
startup.jobs). The shared cleaning rules live in clean_utils.py and are
applied once, to all sources together, in pipeline.py.

Adding a new source = write a new `load_xxx()` function + add it to LOADERS.
"""
from __future__ import annotations

import ast
from pathlib import Path

import numpy as np
import pandas as pd

from clean_utils import parse_skill_list

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"

STAGING_COLUMNS = [
    "source_dataset",     # which raw file the row came from
    "source_platform",    # the job board / API inside that file (LinkedIn, jooble ...)
    "source_record_id",   # id inside the source, if any
    "title", "company", "location", "city", "country_raw",
    "work_mode_raw",      # explicit remote/on-site information, if the source has it
    "job_type_raw", "description",
    "skills_raw",         # final skill list (original + skills the team added)
    "skills_observed_raw",  # only the skills present in the data as collected (per-skill provenance)
    "salary_text",        # free salary text to parse, OR the numeric fields below
    "salary_min", "salary_max", "salary_currency", "salary_period",
    "salary_is_estimate", # True = market benchmark added by the team, not the posting's pay
    "posted_raw", "url", "search_keyword",
    "role_hint",          # a category the source already gives (used as fallback)
]


def _finish(df: pd.DataFrame) -> pd.DataFrame:
    """Add missing staging columns and return them in a fixed order."""
    for col in STAGING_COLUMNS:
        if col not in df:
            df[col] = np.nan
    return df[STAGING_COLUMNS]


def _api_board_file(after_name: str, before_name: str, dataset: str) -> pd.DataFrame:
    """Shared reader for the three files that use the same 16-column API layout
    (Jooble/Careerjet, remote boards, startup.jobs). The original file (before
    the team added skills) gives the observed skills of each posting."""
    after = pd.read_csv(RAW / after_name, low_memory=False)
    before = pd.read_csv(RAW / before_name, usecols=["id", "skills"]).set_index("id")["skills"]
    return after.assign(
        source_dataset=dataset, source_platform=after["source"], source_record_id=after["id"],
        location=after["location_raw"], country_raw=after["country"], job_type_raw=after["job_type"],
        skills_raw=after["skills"], skills_observed_raw=after["id"].map(before),
        salary_text=after["salary"], salary_is_estimate=False,
        posted_raw=after["updated"], url=after["link"], role_hint=after["category"],
    )


# ---------------------------------------------------------------------------
def load_jooble_careerjet() -> pd.DataFrame:
    """Jooble + Careerjet REST APIs, foreign (non-Arab) countries. 18.6k rows.
    Descriptions are API *snippets* (short, with '...'), not full texts."""
    df = _api_board_file("tech_jobs_jooble_careerjet_AGNABY_after_adding_skills.csv",
                         "tech_jobs_jooble_careerjet_AGNABY.csv", "jooble_careerjet_foreign")
    return _finish(df)


def load_remote_boards() -> pd.DataFrame:
    """RemoteOK, We Work Remotely, Himalayas, Arbeitnow, Jobicy, Remotive. 1.1k rows.
    Every row comes from a remote job board -> work_mode_raw = Remote."""
    df = _api_board_file("remote_tech_jobs_foreign_after_adding_skills.csv",
                         "remote_tech_jobs_foreign.csv", "remote_boards")
    return _finish(df.assign(work_mode_raw="Remote"))


def _literal(value) -> dict:
    """startup.jobs stores dicts as text: "{'name': 'ServiceNow', ...}"."""
    try:
        out = ast.literal_eval(value)
        return out if isinstance(out, dict) else {}
    except (ValueError, SyntaxError):
        return {}


def load_startup_jobs() -> pd.DataFrame:
    """startup.jobs API. 3.5k rows, no descriptions.
    `company` and `location_raw` are Python-dict strings; the raw `city` and
    `state_region` columns are broken pieces of that dict, so we re-parse it."""
    df = _api_board_file("startup_jobs_foreign_after_adding_skills.csv",
                         "startup_jobs_foreign.csv", "startup_jobs")
    loc = df["location_raw"].map(_literal)
    df["company"] = df["company"].map(lambda v: _literal(v).get("name", v))
    df["city"] = loc.map(lambda d: d.get("city"))
    df["location"] = loc.map(lambda d: ", ".join(str(d[k]) for k in ("city", "state", "country") if d.get(k)))
    df["work_mode_raw"] = loc.map(lambda d: "Remote" if d.get("remote") else np.nan)
    return _finish(df)


# Team member's market benchmarks: everything that is NOT "Original" or "No data".
def _merged_salary_is_estimate(source: pd.Series) -> pd.Series:
    s = source.fillna("")
    return ~(s.str.startswith("Original") | s.str.startswith("No data"))


def _merged_observed_skills(skills: pd.Series, source: pd.Series, added: pd.Series) -> pd.Series:
    """Original skills of the merged file. The team appended the skills they
    added at the END of `skills`, one per ';' segment, and recorded how many in
    `skills_added_count`:  'bash, python, aws; Python; SQL; Spark; Airflow; Kafka'
    with 5 added -> original = 'bash, python, aws'.
    Only rows whose skills_source says the list came from the source data or the
    posting text ('Original ...', 'Extracted by reading the job description')
    have original skills; 'Inferred ...' / 'No data ...' rows have none.
    (Checked against the Kaggle `job_type_skills` column: identical lists.)"""
    has_original = source.fillna("").str.match(r"Original|Extracted")
    n_added = added.fillna(0).astype(int)

    def original_part(text, n):
        segments = str(text).split(";")
        return ";".join(segments[: len(segments) - n] if n else segments)

    observed = [original_part(t, n) if ok and isinstance(t, str) else np.nan
                for t, n, ok in zip(skills, n_added, has_original)]
    return pd.Series(observed, index=skills.index)


def load_merged_45k() -> pd.DataFrame:
    """The team's merged Excel file (45.6k rows) = two different origins:

    * File 1 'all_tech_jobs'  (6.7k)  - API/board postings with descriptions, 2026
    * File 2 'Arab_Tech_Jobs_Filtered' (38.9k) - the Kaggle 2023 data-jobs dataset
      filtered on *Arab search locations*. WARNING: its `job_country` is the
      SEARCH location (21k rows say 'Sudan' but are US jobs). The team's
      `country` column was rebuilt from the real location, so we use that.
    """
    df = pd.read_excel(RAW / "Merged_Tech_Jobs_45k_skills_enriched_AFTER_ADDING_SKILLS.xlsx")
    file2 = df["record_origin"].str.startswith("File 2")
    is_estimate = _merged_salary_is_estimate(df["salary_source"])
    has_salary = ~df["salary_source"].fillna("No data").str.startswith("No data")

    # File 2 original salaries come as numbers (Kaggle dataset, USD).
    year, hour = df["salary_year_avg"], df["salary_hour_avg"]
    numeric = file2 & ~is_estimate & (year.notna() | hour.notna())
    value = year.fillna(hour)

    wfh = df["job_work_from_home"].map({1.0: "Remote", 0.0: "On-site"})
    out = pd.DataFrame({
        "source_dataset": np.where(file2, "kaggle_2023_arab_search", "all_tech_jobs"),
        "source_platform": df["source"].str.replace(r"^via\s+", "", regex=True),
        "source_record_id": df["id"],
        "title": df["title"], "company": df["company"], "location": df["location_raw"],
        "city": df["city"], "country_raw": df["country"],
        "work_mode_raw": wfh.where(file2, np.where(df["country"].eq("Worldwide"), "Remote", None)),
        "job_type_raw": df["job_type"], "description": df["description"],
        "skills_raw": df["skills"],
        "skills_observed_raw": _merged_observed_skills(df["skills"], df["skills_source"], df["skills_added_count"]),
        "salary_text": df["salary"].where(has_salary & ~numeric),
        "salary_min": value.where(numeric), "salary_max": value.where(numeric),
        "salary_currency": np.where(numeric, "USD", None),
        "salary_period": np.where(numeric, np.where(year.notna(), "year", "hour"), None),
        "salary_is_estimate": is_estimate & has_salary,
        "posted_raw": df["job_posted_date"].fillna(df["updated"]),
        "url": df["link"], "search_keyword": df["search_keyword"].fillna(df["search_location"]),
        "role_hint": df["job_title_short"].fillna(df["category"]),
    })
    return _finish(out)


def load_international() -> pd.DataFrame:
    """Kaggle 'data jobs 2023' dataset (Google Jobs), non-Arab search locations.
    705.9k rows - the largest source. No descriptions and no URLs; salaries are
    yearly or hourly averages in USD; skills come from the dataset (original)."""
    cols = ["job_title_short", "job_title", "job_location", "job_via", "job_schedule_type",
            "job_work_from_home", "search_location", "job_posted_date", "job_country",
            "salary_year_avg", "salary_hour_avg", "company_name", "job_skills"]
    df = pd.read_csv(RAW / "International_Tech_Jobs_Filtered.csv", usecols=cols, low_memory=False)
    year, hour = df["salary_year_avg"], df["salary_hour_avg"]
    has_salary = year.notna() | hour.notna()
    out = pd.DataFrame({
        "source_dataset": "kaggle_2023_international",
        "source_platform": df["job_via"].str.replace(r"^via\s+", "", regex=True),
        "title": df["job_title"], "company": df["company_name"],
        "location": df["job_location"], "country_raw": df["job_country"],
        "work_mode_raw": np.where(df["job_work_from_home"], "Remote", "On-site"),
        "job_type_raw": df["job_schedule_type"],
        "skills_raw": df["job_skills"], "skills_observed_raw": df["job_skills"],
        "salary_min": year.fillna(hour), "salary_max": year.fillna(hour),
        "salary_currency": np.where(has_salary, "USD", None),
        "salary_period": np.where(year.notna(), "year", np.where(hour.notna(), "hour", None)),
        "salary_is_estimate": False,
        "posted_raw": df["job_posted_date"], "search_keyword": df["search_location"],
        "role_hint": df["job_title_short"],
    })
    return _finish(out)


def load_arab_jobs() -> pd.DataFrame:
    """Arab-market postings (439 rows) from three sub-files: Wuzzuf-style
    'arab_tech_jobs', the 'arab_tech_jobs_strict' ATS export and the
    'ArabJobs_Tech_Only' Arabic corpus.

    ArabJobs titles carry the location at the end:
    'مطور ويب - مصمم جرافيك - القاهرة الجديدة - القاهرة' -> the last two
    ' - ' segments (area, city) are removed from the title.
    Salaries: `salary_basis == 'posted'` is real pay, everything else is a
    benchmark the team added (monthly, local currency)."""
    df = pd.read_csv(RAW / "arab_tech_jobs_skills_enriched_AFTER_ADDING_SKILLS_439.csv")
    arabjobs = df["source_file"].eq("ArabJobs_Tech_Only")
    parts = df["title"].str.split(" - ")
    df.loc[arabjobs, "title"] = parts[arabjobs].map(lambda p: " - ".join(p[:-2]) if len(p) >= 3 else " - ".join(p))

    salary_known = df["salary_local"].notna()
    out = pd.DataFrame({
        "source_dataset": "arab_jobs",
        "source_platform": df["platform"].fillna(df["source_file"]),
        "source_record_id": df["row_id"],
        "title": df["title"], "company": df["company"], "location": df["location_raw"],
        "city": df["location_raw"], "country_raw": df["country"],
        "work_mode_raw": df["work_mode"].replace({"Not remote": "On-site"}),
        "job_type_raw": df["job_type"], "description": df["description"],
        # `skills_original` is the posting's own skills field before the team edited it
        "skills_raw": df["skills"], "skills_observed_raw": df["skills_original"],
        "salary_min": df["salary_local"].where(salary_known),
        "salary_max": df["salary_local"].where(salary_known),
        "salary_currency": df["salary_currency"].where(salary_known),
        "salary_period": np.where(salary_known, "month", None),
        "salary_is_estimate": salary_known & ~df["salary_basis"].eq("posted"),
        "posted_raw": df["posted_at"], "url": df["apply_url"],
        "role_hint": df["job_track"],
    })
    return _finish(out)


def load_cybersecurity() -> pd.DataFrame:
    """Hand-collected cybersecurity postings in the Gulf and Egypt (58 rows)."""
    df = pd.read_csv(RAW / "cybersecurity_jobs_expanded_6_columns.csv")
    out = pd.DataFrame({
        "source_dataset": "cybersecurity_manual", "source_platform": "manual collection",
        "title": df["job_title"], "company": df["company_name"],
        "location": df["city"] + ", " + df["country"], "city": df["city"],
        "country_raw": df["country"], "skills_raw": df["required_skills"],
        "skills_observed_raw": df["required_skills"], "salary_text": df["salary"], "salary_is_estimate": False,
        "role_hint": "Cybersecurity",
    })
    return _finish(out)


LOADERS = {
    "jooble_careerjet_foreign": load_jooble_careerjet,
    "remote_boards": load_remote_boards,
    "startup_jobs": load_startup_jobs,
    "merged_45k": load_merged_45k,
    "kaggle_2023_international": load_international,
    "arab_jobs": load_arab_jobs,
    "cybersecurity_manual": load_cybersecurity,
}
