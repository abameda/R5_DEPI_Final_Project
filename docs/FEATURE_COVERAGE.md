# Feature coverage

## 1. Project requirements (Project Documentation, section 3)

| Req. | Requirement | Where it is met | Status |
|---|---|---|---|
| US-01 / FR-14 / FR-22 | Postings by country and market type, sample size shown | Overview (countries, market type, KPI strip), Geography | Done |
| US-02 / FR-21 | Filters for role, country, market, source; each filter updates all views; clear empty message | Global filter bar; empty states with recovery | Done |
| US-03 / UC-02 / FR-15 / FR-23 | Ranked skills for a role with counts and postings analyzed | Skills › Demand, Overview, skill profile | Done |
| US-04 / UC-03 / FR-16 / FR-24 | Arab vs international vs remote skills side by side; skills mainly in one market highlighted; warning for small groups | Skills › By segment (market lattice), Compare markets ("mainly in", too-few-postings warning hides ranking) | Done |
| US-05 / UC-04 / FR-25 | "What should I learn?": ranked skills with counts and method explained; broaden-filters flow | Career planner | Done |
| US-06 | Browse postings with link to the original source; source attributed | Job explorer + detail | Done (links exist for 2.9% of postings: only API/board sources provide them) |
| US-07 / FR-18–20 | Predicted role category from a pasted description | Not in this dashboard (WP7 classifier, other team members) | Not done — see §4 |
| US-08 | Charts as images, tables as CSV | PNG + CSV on every chart panel; builder CSV | Done |
| US-10 / FR-26 / FR-27 | Run from a clean clone following the README | README + DEPLOYMENT.md | Done (Windows verified) |
| US-11 | One loader per source | `src/loaders.py` (unchanged structure) | Done |
| FR-04 | Market type by a documented rule | `clean_utils.assign_market_type`; rule shown in Overview info | Done |
| FR-06 / NFR-05 | No emails/phones stored or displayed | Pipeline (0 remaining); descriptions shown as cleaned | Done |
| FR-09 | Duplicates removed, list of sources kept | Pipeline; "Found N times across boards" in posting detail; listings vs unique KPIs | Done |
| FR-11 / FR-28 | Data-quality report, stage counts | `reports/` + Data & methodology page | Done |
| FR-17 | Salaries with coverage and currency | Salary lab (coverage KPIs, currency and period mix) | Done |
| NFR-01 | Initial load < 5 s, filter updates < 3 s on a laptop | Measured 0.64 s / 0.25 s medians (TESTING.md) | Done |
| NFR-08 | Raw data not redistributed, attribution shown | Data git-ignored; aggregate-only exports; paginated, rate-limited postings; sources named per posting | Done |
| NFR-10 | Arabic displays correctly incl. RTL | `dir="auto"` / `<bdi>` on titles, employers, descriptions; Readex Pro has Arabic | Done (spot-checked) |
| NFR-11 | Every chart has a title, labelled axes and the sample size | ChartPanel meta lines + table view | Done |
| NFR-12 | Not colour alone, readable contrast | Hatching/dashes for added skills and small samples; axe-core AA scans pass; CVD-validated palette | Done |
| NFR-15 | No crash on empty/unusual selections | Empty states, error boundary, e2e empty-state and out-of-range tests | Done |
| NFR-24 | ≥ 15 tests for cleaning rules | 39 pipeline tests (+ 53 API, 9 unit, 39 e2e) | Done |
| S1 | 10 of 10 sampled figures match the analysis outputs | `tests/test_integrity_real.py` (11 figures, independent pandas) | Done |
| U1 / U2 | Pilot users | Not run (needs participants) | Not done — see §4 |

## 2. Brief modules (A–L)

| Module | Status | Notes |
|---|---|---|
| A Executive overview | Done | |
| B Job explorer | Done | |
| C Skills intelligence | Done | Skill trends limited to the 2023 cohort |
| D Salary lab | Done | Benchmarks in their own view only |
| E Geography | Done | Choropleth via Natural Earth; no city-level geocoding |
| F Career & skill gap | Done | Alignment is descriptive, not a hiring probability |
| G Comparison studio | Done | |
| H Employers | Done | Sample counts, not company size |
| I Trends | Done, restricted | Within-cohort only; no growth rates across cohorts; no forecasting |
| J Data quality & methodology | Done | |
| K Insight builder | Done | Aggregate CSV only |
| L Guided insights | Done | Deterministic templates; no LLM (no paid dependency, no risk of invented numbers) |

## 3. Data-to-feature coverage matrix

✔ = field powers the feature; F = filter only.

| Field | Overview | Explorer | Skills | Salary | Geo | Employers | Trends | Compare | Career | Builder | Quality |
|---|---|---|---|---|---|---|---|---|---|---|---|
| title | | ✔ search | | | | ✔ titles | | | ✔ postings | | |
| company / company_is_placeholder | ✔ employers | ✔ | ✔ profile | ✔ by employer | ✔ | ✔ | | ✔ | ✔ | ✔ | ✔ |
| role_category | ✔ | ✔ | ✔ lattice | ✔ | ✔ role mix | ✔ | ✔ | ✔ | ✔ target | ✔ | |
| seniority | ✔ | ✔ | ✔ | ✔ | | ✔ | | ✔ | F | ✔ | |
| country / region | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | F | ✔ | F | ✔ | ✔ |
| market_type | ✔ | ✔ | ✔ | ✔ | ✔ | | F | ✔ | ✔ | ✔ | |
| work_mode / job_type | ✔ | ✔ | ✔ | ✔ | ✔ remote | ✔ | F | ✔ | F | ✔ | |
| language | | ✔ | | | | | | | | ✔ | ✔ |
| description | | ✔ detail | | | | | | | | | ✔ coverage |
| job_skills.skill | ✔ | ✔ chips | ✔ | ✔ by skill | ✔ top skill | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| job_skills.is_observed | ✔ split | ✔ chips | ✔ split | F | F | ✔ | F | ✔ | ✔ flags | F | ✔ |
| skills_dim.category / is_technical | ✔ | ✔ | ✔ | | | | | | ✔ | ✔ | ✔ |
| salary_* / salary_kind | ✔ | ✔ | ✔ with/without | ✔ | ✔ median | ✔ | | ✔ | | ✔ | ✔ |
| posted_date / month / cohort | ✔ | ✔ sort | ✔ trend | | ✔ cohort mix | ✔ recency | ✔ | ✔ | F | ✔ | ✔ |
| source_dataset / platform / sources / duplicate_count | ✔ | ✔ | ✔ | ✔ coverage | | ✔ listings | ✔ | ✔ | | ✔ | ✔ |
| url | | ✔ link | | | | | | | ✔ | | ✔ |
| search_keyword | | | | | | | | | | | ✔ Sudan evidence |
| pipeline_stats.json | | | | | | | | | | | ✔ |

## 4. Deliberately excluded or partial

| Item | Reason |
|---|---|
| Role classifier, "paste a description" (US-07, FR-18–20) | Owned by WP7 (other members). Training a classifier on the title-rule labels would learn the rules back (leakage), and descriptions are 97.7% missing, so no responsible text model can be trained from this dataset alone |
| Forecasting | One year of comparable history (2023) and no hold-out period; the 2024–26 collection is a different method |
| Growth rates 2023 → 2026 | Cohorts differ in sources, roles and method |
| City-level maps / geocoding | Location text is not verified enough to geocode |
| LLM-written summaries | Not needed for grounded template insights; avoids invented statistics and a paid dependency |
| Saved views (beyond URLs) | URLs already capture the full state; bookmarking/sharing a link is the saved view |
| Arabic UI translation / RTL layout | Content is RTL-safe; the interface is English (the language of the project documents); full localization is future work |
| Skill clustering / ML role similarity | Role similarity uses transparent cosine similarity of skill-share vectors; no trained model is claimed |
| Pilot-user study (U1/U2) | Requires participants; e2e tests script the four core tasks but are not a usability study |
