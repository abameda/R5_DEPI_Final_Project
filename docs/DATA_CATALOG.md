# Data catalog

Inventory of every dataset the dashboard uses, its fields, coverage and limits.
Figures are from the pipeline run of 2026-10-25 (`reports/pipeline_stats.json`,
`reports/data_quality_report.md`) and the analytical store built from it.

## 1. Sources

| # | Raw file (`data/raw/`) | Raw rows | Kept (unique) | Origin | Period | What it contributes |
|---|---|---:|---:|---|---|---|
| 1 | `International_Tech_Jobs_Filtered.csv` | 705,866 | 539,403 | Kaggle "data jobs 2023" (Google Jobs), non-Arab search locations | Jan–Dec 2023 | Bulk of the sample; data roles only; skills + `job_type_skills` categories; salaries for ~5% |
| 2 | `Merged_Tech_Jobs_45k_skills_enriched_AFTER_ADDING_SKILLS.xlsx` — File 2 rows | 38,898 | 31,600 | Same Kaggle dataset, Arab search locations | Jan–Dec 2023 | Arab-market 2023 postings; team-attached salary benchmarks |
| 3 | same `.xlsx` — File 1 rows ("all_tech_jobs") | 6,693 | 3,535 | Team's API/board collection with descriptions | mostly 2026 | Descriptions, URLs, team-added skills |
| 4 | `tech_jobs_jooble_careerjet_AGNABY[_after_adding_skills].csv` | 18,583 | 9,101 | Jooble + Careerjet REST APIs | Dec 2025 – Oct 2026 | Current international postings; description snippets; salaries for ~32% |
| 5 | `startup_jobs_foreign[_after_adding_skills].csv` | 3,543 | 3,426 | startup.jobs API | Oct 2026 | Startup postings; salaries for ~44% |
| 6 | `remote_tech_jobs_foreign[_after_adding_skills].csv` | 1,075 | 1,006 | RemoteOK, WWR, Himalayas, Arbeitnow, Jobicy, Remotive | 2024–2026 | Remote postings with full descriptions |
| 7 | `arab_tech_jobs_skills_enriched_AFTER_ADDING_SKILLS_439.csv` | 439 | 416 | Wuzzuf-style boards, ATS exports, ArabJobs corpus | 2024–2026 | Arabic text, local salaries (EGP/SAR/AED…) |
| 8 | `cybersecurity_jobs_expanded_6_columns.csv` | 58 | 58 | Manual collection (Gulf, Egypt) | undated | Cybersecurity roles |

Raw total 775,155 rows → 773,374 after dropping 5 untitled and 1,776 non-tech rows →
770,956 after exact de-duplication → **588,545 unique postings** after near-duplicate
merging (104,715 postings were found on more than one board; `duplicate_count`,
`sources` keep that evidence).

Licensing: raw third-party data is **not** redistributed (NFR-08). `data/raw`,
`data/processed`, `data/analytics` are git-ignored; the dashboard only exports aggregates.

## 2. Tables

### `jobs_clean.csv` → store table `jobs` (one row per unique posting)

Null % and distinct counts measured on the store (distinct counts are HyperLogLog
approximations except where marked exact).

| Column | Type | Null | Distinct | Meaning |
|---|---|---:|---:|---|
| `jid` | int | 0% | 588,545 (exact) | Store-only integer key used for joins |
| `job_id` | text | 0% | 588,545 (exact) | Stable 16-char hash id from the pipeline |
| `title` | text | 0% | ~215k | Cleaned title (encoding fixed, Arabic normalized, gender tags removed) |
| `company` | text | 0% | ~137k | Employer as given; may be a job board or "Confidential" (see `company_is_placeholder`) |
| `role_category` | text | 0% | 17 (exact) | Keyword rule on the title (`clean_utils.ROLE_RULES`), source hint as fallback |
| `seniority` | text | 0% | 6 | Title keywords; 65% "Not specified" |
| `country` | text | 1.0% | 159 (exact) | Standardized; null = remote/worldwide or unknown |
| `city` | text | 25.9% | ~13.7k | Source city or first part of the location text |
| `location` | text | 0.2% | ~18.5k | Original location text (normalized) |
| `region` | text | 0% | 3 | Arab / Non-Arab / Worldwide-Unknown |
| `market_type` | text | 0% | 4 | Remote > Arab > International > Unknown (FR-04 rule) |
| `work_mode` | text | 0% | 4 | Remote / Hybrid / On-site / Not specified |
| `job_type` | text | 0% | 6 | ~120 spellings collapsed to Full-time, Contract, Part-time, Internship, Temporary, Unknown |
| `language` | text | 0% | 4 | en / ar / mixed / unknown (letter-share rule) |
| `description` | text | 97.7% | — | Only API/board sources carry it; Jooble/Careerjet are snippets; PII removed |
| `skills` | text | 12.7% | — | Display names joined by `; ` |
| `skills_count` | int | 0% | — | Number of skills (written + added) |
| `skills_observed_count` | int | 0% | — | Skills present in the data as collected |
| `skills_enriched` | bool | 0% | 2 | True = at least one skill was added by the team (48,593 postings) |
| `salary_min/max/currency/period` | mixed | 91.8% | — | As parsed from the source |
| `salary_usd_annual` | float | 91.8% | — | Midpoint × periods/year × fixed USD rate; kept only in $500–$1M |
| `salary_is_estimate` (CSV) → `salary_kind` (store) | — | 0% | 5 | `advertised`, `benchmark`, `advertised_unusable`, `benchmark_unusable`, `none` |
| `posted_date`, `posted_year`, `posted_month` | date/int | 0.6% | — | Posting date; 3,723 undated |
| `source_dataset` | text | 0% | 8 | Which raw file |
| `source_platform` | text | 0% | ~7k | Board/API inside the file (LinkedIn, BeBee, jooble…) |
| `sources`, `duplicate_count` | text/int | 0% | — | Every platform a merged posting appeared on, and how many copies |
| `url` | text | 97.1% | — | Link to the original advert (API/board sources only) |
| `search_keyword` | text | 0.1% | ~248 | Search term / search location used at collection |
| `cohort` (store) | text | 0% | 2 | `kaggle_2023` (sources 1–2) or `collected_2026` (all others) |
| `company_is_placeholder` (store) | bool | 0% | 2 | Job boards and hidden-employer labels (pipeline's `PLACEHOLDER_COMPANIES`) — 17,099 postings |

### `job_skills.csv` → store table `job_skills` (one row per posting × skill)

3,041,680 rows, 1,475 distinct skills, 513,668 postings with at least one skill.

| Column | Meaning |
|---|---|
| `job_id` / `jid` | Posting |
| `skill` | Canonical display name (synonyms merged: `k8s` → Kubernetes, `.NET`, `microsoft-azure` → Azure …) |
| `is_observed` | **True** = the skill was in the posting data as collected; **False** = added by the team. 89.6% of rows are observed. |

How `is_observed` is derived (per source): Kaggle file and cyber file — all observed;
API/board files — present in the original (pre-enrichment) file; merged 45k file — the
original part of `skills` (everything before the last `skills_added_count` `;`-segments)
for rows whose `skills_source` starts with "Original" or "Extracted"; rows marked
"Inferred" / "No data" have no observed skills. Validated: on all 31,178 "Original"
Kaggle Arab-search rows the recovered list equals the dataset's own `job_type_skills`.

### `skills_dim.csv` → store table `skills`

| Column | Meaning |
|---|---|
| `skill`, `skill_key` | Display name and canonical lower-case key |
| `category` | 17 categories, e.g. Programming & query languages, Cloud & data platforms, Security & compliance, Soft skills & management |
| `category_source` | `kaggle` (233 skills, 93.5% of mentions) — Kaggle's own `job_type_skills` grouping; `kaggle (corrected)` (4: Oracle/NoSQL → Databases, GDPR → Security); `curated` (156, 3.8%) — documented list in `src/skill_taxonomy.py`; `none` (1,082 long-tail skills, 0.13% of mentions) — left Uncategorized, not guessed |
| `is_technical` | False only for Soft skills & management and Spoken languages |

### `reports/pipeline_stats.json` → store table `meta`

Stage counts, dropped rows, raw rows per source, pipeline runtime and the "Sudan"
correction evidence. The store adds `dataset_kind` (`real`/`synthetic`) and `built_at`.

## 3. Relationships

```
jobs (1) ──< job_skills (n) >── (1) skills
  jid / job_id          jid, skill        skill
```

`skill_totals` (store) is a pre-aggregated count per skill used for search ranking only.

## 4. Coverage

| Dimension | Coverage |
|---|---|
| Geography | 159 countries; United States 29%, India 7%, UK 6%; Arab League 15,646 postings (2.7%) in 19 countries; 5,620 remote/unknown |
| Time | 2023 archive: every month Jan–Dec 2023 (35k–61k postings/month). 2024–26 collection: 11,632 in Oct 2026, 1,537 in Sep 2026, < 400 in every earlier month |
| Roles | Data Engineering 30%, Data Analysis & BI 29%, Data Science & AI 28% — inherited from the data-jobs scope of the Kaggle archive |
| Salary | Advertised 33,586 (5.7%), benchmark 14,891 (2.5%), 18 currencies, mostly USD |
| Skills | 87.3% of postings list ≥ 1 skill |
| Language | 99.9% English; 455 Arabic or mixed postings |

## 5. Analytical use cases supported

Demand by role, country, market, seniority, work mode, source and cohort; skill demand
and co-occurrence; per-role skill profiles and gaps; advertised salary distributions by
role, country, seniority, skill and employer (n permitting); employer footprints;
within-2023 monthly trends; snapshot comparison of the two cohorts.

## 6. Data that cannot be used responsibly (and how the dashboard treats it)

| Data | Why | Treatment |
|---|---|---|
| Kaggle `job_country` in the merged file | It is the **search** location ("Sudan" for 21,141 rows, mostly US jobs) | Ignored by the pipeline; country rebuilt from the location. Evidence on the methodology page |
| Benchmark salaries | Market figures for a title + country, not the posting's pay | Separate "benchmark" view only; never in advertised statistics |
| 2023 vs 2026 differences as trends | Different sources, scope and method | Shown only as side-by-side snapshots; no growth rates or forecasts |
| Team-added skills as posting requirements | Inferred after collection | Hatched in charts; excluded with the "Written in posting" switch |
| Company counts as company size / hiring | The sample is not a census | Labelled "postings in this sample"; job boards flagged |
| Descriptions for NLP | 97.7% missing; snippets for Jooble/Careerjet | Shown in posting detail only; no text analytics |
| Role classifier output | Not built yet (WP7, other team members) | Role categories are the documented keyword baseline |
