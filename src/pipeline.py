"""Cleaning pipeline: raw files  ->  one clean, deduplicated dataset.

Run from the project root:
    python src/pipeline.py

Steps (record counts are logged after each one, FR-28):
    1. Load every source with its own loader            (loaders.py)
    2. Clean text, remove personal data                  (FR-06, FR-07)
    3. Standardize country, work mode, market type       (FR-04, FR-08)
    4. Standardize job type, seniority, role, language   (FR-05, FR-10)
    5. Parse skills and salaries                         (FR-12, FR-17)
    6. Drop rows that are unusable or non-tech           (FR-10)
    7. Remove duplicates: exact, same URL, near-duplicate (FR-09)
    8. Save outputs + data-quality report                (FR-11)

Outputs (data/processed/ and reports/):
    jobs_clean.csv           one row per unique posting
    job_skills.csv           long table: one row per (job_id, skill)
    data_quality_report.md   counts, missing values, duplicates per source
"""
from __future__ import annotations

import hashlib
import logging
import time
from pathlib import Path

import numpy as np
import pandas as pd

import clean_utils as cu
from loaders import LOADERS

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed"
REPORTS = ROOT / "reports"

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("pipeline")

# Role categories that sources already provide -> our category names.
# Used only when the title rules return "Other / Unclassified".
ROLE_HINTS = {
    "Data Analyst": "Data Analysis & BI", "Senior Data Analyst": "Data Analysis & BI",
    "Business Analyst": "Data Analysis & BI", "Data Engineer": "Data Engineering",
    "Senior Data Engineer": "Data Engineering", "Data Scientist": "Data Science & AI",
    "Senior Data Scientist": "Data Science & AI", "Machine Learning Engineer": "Data Science & AI",
    "Software Engineer": "Software Engineering", "Cloud Engineer": "DevOps & Cloud",
    "software": "Software Engineering", "hardware": "Embedded & Hardware",
    "cybersecurity": "Cybersecurity", "Cybersecurity": "Cybersecurity",
    "Software / General Dev": "Software Engineering", "Backend": "Backend",
    "Frontend": "Frontend", "Full Stack": "Full Stack", "Mobile": "Mobile",
    "Data & AI": "Data Science & AI", "DevOps / Cloud / Infra": "DevOps & Cloud",
    "IT Support": "IT Support & Networking", "IT (general)": "IT Support & Networking",
    "QA / Testing": "QA & Testing", "Security": "Cybersecurity",
    "Product / Project": "Product & Project", "Design / UX": "Design & UX",
    "Engineering (non-software)": "Other Engineering",
    "Sales / Marketing": "Non-tech", "HR / Admin / Finance": "Non-tech",
}
# "Company" values that are not a real employer: hidden names ('Confidential'
# in several languages) and job boards / staffing platforms that post jobs of
# many different employers under their own name. For these, title+location is
# not enough to say two rows are the same job.
PLACEHOLDER_COMPANIES = {
    "confidential", "confidenziale", "confidencial", "confidentiel", "vertraulich",
    "empresa confidencial", "unknown", "not disclosed", "n a", "nan", "", "anonymous",
    "emprego", "dice", "upwork", "clickjobs io", "jobleads uk", "listopro",
    "jobs for humanity", "bebee", "talent com", "jooble",
}

FINAL_COLUMNS = [
    "job_id", "title", "company", "role_category", "seniority",
    "country", "city", "location", "region", "market_type", "work_mode", "job_type",
    "language", "description", "description_length",
    "skills", "skills_count", "skills_enriched",
    "salary_min", "salary_max", "salary_currency", "salary_period",
    "salary_usd_annual", "salary_is_estimate",
    "posted_date", "posted_year",
    "source_dataset", "source_platform", "sources", "duplicate_count",
    "url", "search_keyword",
]


class StageLog:
    """Keeps (stage, rows) pairs for the report and prints them as we go."""

    def __init__(self):
        self.rows: list[tuple[str, int]] = []

    def __call__(self, stage: str, df: pd.DataFrame):
        self.rows.append((stage, len(df)))
        log.info("%-48s %10s rows", stage, f"{len(df):,}")


# ---------------------------------------------------------------------------
def load_all(stages: StageLog) -> pd.DataFrame:
    frames = []
    for name, loader in LOADERS.items():
        t = time.perf_counter()
        part = loader()
        log.info("loaded %-30s %9s rows  (%.1fs)", name, f"{len(part):,}", time.perf_counter() - t)
        frames.append(part)
    df = pd.concat(frames, ignore_index=True)
    stages("1. raw rows loaded (all sources)", df)
    return df


def clean_text_fields(df: pd.DataFrame) -> pd.DataFrame:
    """FR-06 + FR-07: normalize text and remove emails / phone numbers."""
    df["title"] = cu.remove_pii(cu.clean_title(df["title"]))
    df["company"] = cu.normalize_series(df["company"])
    df["location"] = cu.normalize_series(df["location"])
    df["city"] = cu.normalize_series(df["city"])
    df["description"] = cu.remove_pii(cu.normalize_series(df["description"]))
    df["description_length"] = df["description"].str.len().astype("Int64")
    return df


def standardize_location(df: pd.DataFrame) -> pd.DataFrame:
    """FR-04 + FR-08: country, city, work mode, market type and region."""
    worldwide = cu.is_worldwide(df["country_raw"]) | cu.is_worldwide(df["location"])
    df["country"] = cu.standardize_country(df["country_raw"])
    # Missing country -> look for a country name inside the location text.
    missing = df["country"].isna() & ~worldwide
    known = set(df["country"].dropna().unique()) | cu.ARAB_COUNTRIES
    df.loc[missing, "country"] = cu.country_from_location(df.loc[missing, "location"], known)

    # City: use the source's city column, else the first part of the location
    # text ("Houston, TX" -> "Houston"); never a country name or "Remote".
    first_part = df["location"].str.split(r",| - |\(", regex=True).str[0].str.strip()
    city = df["city"].fillna(first_part)
    bad_city = cu.is_worldwide(city) | city.isin(df["country"].dropna().unique()) | city.eq(df["country"])
    df["city"] = city.mask(bad_city)

    # Work mode: explicit source info first, then keywords in title/location.
    inferred = cu.infer_work_mode(df["title"], df["location"])
    df["work_mode"] = (df["work_mode_raw"].where(df["work_mode_raw"].isin(["Remote", "Hybrid", "On-site"]))
                       .fillna(inferred).mask(worldwide, "Remote").fillna("Not specified"))

    df["market_type"] = cu.assign_market_type(df["country"], df["work_mode"])
    df["region"] = np.select([df["country"].isin(cu.ARAB_COUNTRIES), df["country"].notna()],
                             ["Arab", "Non-Arab"], default="Worldwide / Unknown")
    return df


def standardize_categories(df: pd.DataFrame) -> pd.DataFrame:
    """Job type, seniority, role category (with source hint fallback), language."""
    df["job_type"] = cu.standardize_job_type(df["job_type_raw"])
    df["seniority"] = cu.infer_seniority(df["title"])
    role = cu.categorize_role(df["title"])
    hint = df["role_hint"].map(ROLE_HINTS)
    df["role_category"] = role.mask(role.eq("Other / Unclassified") & hint.notna(), hint)
    df["language"] = (df["title"].fillna("") + " " + df["description"].fillna("")).map(cu.detect_language)
    return df


def standardize_skills(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Parse skills into canonical keys, then pick ONE display spelling per skill:
    the most common capitalized spelling seen anywhere in the raw data
    (so 'python' -> 'Python', 'aws' -> 'AWS', 'power bi' -> 'Power BI')."""
    df["skill_keys"] = df["skills_raw"].map(cu.parse_skill_list)

    # Collect raw spellings -> display name.
    raw_tokens = (df["skills_raw"].dropna().astype(str)
                  .str.replace(r"[\[\]']", "", regex=True).str.split(r"[;,|\n]", regex=True)
                  .explode().str.strip(" '\"-•."))
    raw_tokens = raw_tokens[raw_tokens.str.len().between(1, 40)]
    keys = raw_tokens.str.lower().str.replace(r"\s+", " ", regex=True).map(lambda k: cu.SKILL_SYNONYMS.get(k, k))
    spelled = pd.DataFrame({"key": keys, "raw": raw_tokens})
    capitalized = spelled[spelled["raw"].str.contains(r"[A-Z]")]
    # count every (key, spelling) pair, then keep the most frequent spelling per key
    display = (capitalized.value_counts(["key", "raw"]).reset_index()
               .drop_duplicates("key").set_index("key")["raw"])

    df["skills"] = df["skill_keys"].map(lambda ks: "; ".join(display.get(k, k) for k in ks) or np.nan)
    df["skills_count"] = df["skill_keys"].str.len()
    return df, display


def standardize_salary(df: pd.DataFrame) -> pd.DataFrame:
    """FR-17: parse free salary text (when no numeric values yet) -> annual USD."""
    need = df["salary_text"].notna() & df["salary_min"].isna()
    parsed = pd.DataFrame(df.loc[need, "salary_text"].map(cu.parse_salary).tolist(),
                          index=df.index[need])
    for col in ["salary_min", "salary_max", "salary_currency", "salary_period"]:
        df.loc[need, col] = parsed[col]
    has_salary = df["salary_min"].notna()
    # "MAD (proxy)" -> "MAD"; no currency written -> the country's local currency
    currency = df["salary_currency"].str.replace(r"\s*\(.*\)", "", regex=True)
    df["salary_currency"] = currency.fillna(df["country"].map(cu.COUNTRY_CURRENCY).where(has_salary))
    df["salary_usd_annual"] = cu.salary_to_usd_annual(df)
    df["salary_is_estimate"] = df["salary_is_estimate"].fillna(False).astype(bool) & has_salary
    return df


def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    dates = pd.to_datetime(df["posted_raw"], errors="coerce", utc=True, format="mixed")
    # 1,255 Himalayas rows carry '1970-01-21' (a broken Unix timestamp) -> unknown
    dates = dates.where(dates.dt.year >= 2000)
    df["posted_date"] = dates.dt.date
    df["posted_year"] = dates.dt.year.astype("Int64")
    return df


# ---------------------------------------------------------------------------
def _quality_score(df: pd.DataFrame) -> pd.Series:
    """Which copy of a duplicate group to keep: the most informative one."""
    return (df["description"].notna() * 8 + (df["salary_min"].notna() & ~df["salary_is_estimate"]) * 4
            + df["url"].notna() * 2 + df["skills_count"].clip(upper=20) / 20)


def deduplicate(df: pd.DataFrame, stages: StageLog) -> pd.DataFrame:
    """FR-09: remove exact and near-duplicate postings across sources and keep
    the list of sources each kept posting was found in."""
    # 7a. exact duplicates over the cleaned fields
    subset = ["title", "company", "location", "description", "skills", "salary_text",
              "posted_date", "source_platform", "url"]
    df = df.drop_duplicates(subset=subset)
    stages("7a. after removing exact duplicates", df)

    # 7b. near duplicates: same normalized title + company + location + country.
    #     When the company is a placeholder ('Confidential', 'Emprego', 'Dice'),
    #     the posting date and start of the description are added so different
    #     jobs hidden behind the same placeholder are not merged.
    company_key = cu.match_key(df["company"])
    placeholder = company_key.isin(PLACEHOLDER_COMPANIES)
    desc_key = (df["posted_date"].astype(str).fillna("") + " "
                + cu.match_key(df["description"].str[:120])).where(placeholder, "")
    df["_key"] = (cu.match_key(df["title"]) + "|" + company_key.mask(placeholder, "") + "|"
                  + cu.match_key(df["location"]) + "|" + df["country"].fillna("") + "|" + desc_key)
    # Same URL = same posting even if the text differs slightly.
    url_key = df["url"].fillna("").str.strip().str.lower()
    df["_key"] = df["_key"].mask(url_key.ne("") & url_key.duplicated(keep=False), "url|" + url_key)

    df["_score"] = _quality_score(df)
    df = df.sort_values(["_score", "posted_date"], ascending=False, na_position="last")
    counts = df.groupby("_key", sort=False).size()
    sources = (df[["_key", "source_platform"]].dropna().drop_duplicates()
               .sort_values("source_platform").groupby("_key")["source_platform"].agg("; ".join))
    df = df.drop_duplicates("_key", keep="first").copy()
    df["sources"] = df["_key"].map(sources)
    df["duplicate_count"] = df["_key"].map(counts).astype(int)
    stages("7b. after removing near-duplicates (title+company+location)", df)
    return df.drop(columns=["_key", "_score"])


def make_job_id(df: pd.DataFrame) -> pd.Series:
    """Stable 16-char id from source + source id (or title/company/location)."""
    basis = (df["source_dataset"] + "|" + df["source_record_id"].fillna("").astype(str) + "|"
             + df["title"].fillna("") + "|" + df["company"].fillna("") + "|"
             + df["location"].fillna("") + "|" + df["posted_date"].astype(str).fillna(""))
    ids = basis.map(lambda s: hashlib.sha1(s.encode("utf-8")).hexdigest()[:16])
    # extremely rare collisions -> add a counter so ids stay unique
    return ids + ids.groupby(ids).cumcount().map(lambda n: "" if n == 0 else f"-{n}")


# ---------------------------------------------------------------------------
def quality_report(raw: pd.DataFrame, clean: pd.DataFrame, stages: StageLog, dropped: dict) -> str:
    """FR-11: markdown data-quality report per source and for the whole dataset."""
    key_fields = ["title", "company", "country", "description", "skills", "salary_usd_annual", "posted_date"]
    per_source = pd.DataFrame({
        "raw_rows": raw.groupby("source_dataset").size(),
        "clean_rows": clean.groupby("source_dataset").size(),
    }).fillna(0).astype(int)
    per_source["removed_%"] = (100 * (1 - per_source["clean_rows"] / per_source["raw_rows"])).round(1)
    g = clean.groupby("source_dataset")
    per_source["median_desc_len"] = g["description_length"].median()
    per_source["arabic_%"] = g["language"].apply(lambda s: round(100 * s.isin(["ar", "mixed"]).mean(), 1))
    per_source["salary_%"] = g["salary_usd_annual"].apply(lambda s: round(100 * s.notna().mean(), 1))

    missing = (clean.groupby("source_dataset")[key_fields]
               .apply(lambda d: (d.isna().mean() * 100).round(1)))
    missing.loc["ALL"] = (clean[key_fields].isna().mean() * 100).round(1)

    pii_left = (clean["description"].fillna("").str.contains(cu.EMAIL_RE).sum()
                + clean["description"].fillna("").str.contains(cu.PHONE_RE).sum())
    lines = [
        "# Data Quality Report",
        "",
        f"Generated by `src/pipeline.py` on {pd.Timestamp.now():%Y-%m-%d %H:%M}.",
        "",
        "## Record counts per pipeline stage",
        "",
        pd.DataFrame(stages.rows, columns=["stage", "rows"]).to_markdown(index=False),
        "",
        "Rows dropped before deduplication: "
        + ", ".join(f"{k}: {v:,}" for k, v in dropped.items()),
        "",
        "## Per source",
        "",
        per_source.to_markdown(),
        "",
        "## Missing values in key fields (% of clean rows)",
        "",
        missing.to_markdown(),
        "",
        "## Unified dataset checks",
        "",
        f"- Exact duplicate rows left: **{clean.drop(columns=['job_id']).duplicated().sum()}** (target 0, NFR-19)",
        f"- Duplicate `job_id`: **{clean['job_id'].duplicated().sum()}**",
        f"- Emails / phone numbers left in descriptions: **{pii_left}** (target 0, NFR-05)",
        f"- Postings found in more than one place (`duplicate_count > 1`): "
        f"**{(clean['duplicate_count'] > 1).sum():,}**",
        "",
        "### Market type", "", clean["market_type"].value_counts().to_frame("rows").to_markdown(), "",
        "### Role category", "", clean["role_category"].value_counts().to_frame("rows").to_markdown(), "",
        "### Language", "", clean["language"].value_counts().to_frame("rows").to_markdown(), "",
        "### Posting year", "", clean["posted_year"].value_counts(dropna=False).sort_index()
        .to_frame("rows").to_markdown(), "",
        "## Known limitations",
        "",
        "- `kaggle_2023_*` rows are from **2023**; API/board rows are from **Oct 2026**. "
        "Filter on `posted_year` when comparing markets over time.",
        "- `skills_enriched = True` means the team **added** skills that were not written in the "
        "posting (inferred from title / similar postings). Use `skills_enriched == False` for "
        "strict skill-demand analysis.",
        "- `salary_is_estimate = True` means a **market benchmark** (Paylab, Indeed, BLS ...) "
        "was attached, not the posting's own pay. Use only `salary_is_estimate == False` for pay analysis.",
        "- Currency conversion uses fixed approximate rates (`USD_PER_UNIT` in `src/clean_utils.py`).",
        "- Jooble/Careerjet descriptions are short API snippets, not full job texts.",
        "- Role category is a keyword rule on the title (baseline); the ML classifier (WP7) should improve it.",
    ]
    return "\n".join(lines)


def main() -> None:
    t0 = time.perf_counter()
    OUT.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(exist_ok=True)
    stages = StageLog()

    df = load_all(stages)
    raw_counts = df[["source_dataset"]].copy()

    df = clean_text_fields(df)
    df = standardize_location(df)
    df = standardize_categories(df)
    df, _ = standardize_skills(df)
    df = standardize_salary(df)
    df = parse_dates(df)
    stages("2-5. after cleaning & standardizing (no rows removed)", df)

    # 6. drop unusable / out-of-scope rows
    no_title = df["title"].isna()
    non_tech = df["role_category"].eq("Non-tech")
    dropped = {"missing title": int(no_title.sum()), "non-tech roles (FR-10)": int((non_tech & ~no_title).sum())}
    df = df[~no_title & ~non_tech]
    stages("6. after dropping missing-title & non-tech rows", df)

    df = deduplicate(df, stages)
    df["job_id"] = make_job_id(df)
    df = df.sort_values(["source_dataset", "posted_date", "title"], na_position="last")

    clean = df[FINAL_COLUMNS].reset_index(drop=True)
    skills_long = (df[["job_id", "skills"]].dropna().assign(skill=lambda d: d["skills"].str.split("; "))
                   .explode("skill")[["job_id", "skill"]])

    # utf-8-sig = UTF-8 with BOM, so Excel / Power BI show Arabic text correctly.
    clean.to_csv(OUT / "jobs_clean.csv", index=False, encoding="utf-8-sig")
    skills_long.to_csv(OUT / "job_skills.csv", index=False, encoding="utf-8-sig")
    (REPORTS / "data_quality_report.md").write_text(
        quality_report(raw_counts, clean, stages, dropped), encoding="utf-8")

    log.info("saved %s (%s rows), %s (%s rows)", "jobs_clean.csv", f"{len(clean):,}",
             "job_skills.csv", f"{len(skills_long):,}")
    log.info("done in %.0fs", time.perf_counter() - t0)


if __name__ == "__main__":
    main()
