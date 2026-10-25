# Data limitations and integrity

What the dataset can and cannot prove, and how the dashboard keeps each limit visible.

## It is a sample of postings, not the labour market

* 588,545 unique postings collected from 8 sources. Counts describe **this sample**:
  not hiring volumes, vacancies, company size or the whole market (project scope,
  section 1.1 "Out of scope").
* Shown on: the rail footer, the methodology page, the Employers page header and
  every exported CSV ("Aggregated from the … posting sample (not the whole labour market)").

## One source dominates

* 91.7% of postings come from the Kaggle "data jobs 2023" archive and 97% from the 2023
  cohort overall. That dataset was collected for **data roles** (analyst, engineer,
  scientist), so data skills (Python, SQL, Tableau, Spark) top every overall ranking.
* The Overview shows a callout whenever the 2023 archive is > 50% of the selection.
  Filter the 2024–26 collection for software, security, embedded and other tracks.

## Two cohorts, not one time series

* 2023 archive: Jan–Dec 2023, one method. 2024–26 collection: mostly Sep–Oct 2026,
  many sources, broader roles.
* Therefore: monthly trends only within a cohort; the cohorts are compared as snapshots;
  no growth percentages between 2023 and 2026; **no forecasting** (there is one year of
  comparable history and no hold-out period to validate a model).

## Geographic imbalance

* United States 29% of postings; Arab League countries 2.7% (15,646) in 19 countries;
  some Arab countries have < 30 postings (flagged "small").
* Arab-market 2023 postings come from Kaggle searches run from Arab locations; 2026
  Arab postings come from small regional sources.
* Countries are never geocoded beyond the posting's own location text.

## The "Sudan" rows

21,141 rows of the merged team file had `job_country = "Sudan"`: the Kaggle **search
location**, not the job location. The pipeline ignores that column and rebuilds the
country from each posting's location: 17,065 United States, 3,902 "Remote (Anywhere)",
170 other/unknown, 4 Arab. After cleaning and de-duplication: 14,287 US, 3,774 with no
single country, 4 Arab. Nothing is attributed to Sudan for that reason.
Evidence: `reports/pipeline_stats.json` → Data & methodology page.

## Skills

* 10.4% of posting–skill pairs were **added by the team** after collection (inferred from
  the title, the description or "typical skills" for the role). For some segments this
  dominates: e.g. Arab-market Data Analysis postings list Python at ~96%, mostly team-added.
* Every skill bar splits written (solid) vs added (hatched); the "Written in posting"
  switch removes added skills from counts and denominators; the career planner flags
  "mostly team-added" priorities.
* Skills were extracted by the sources' own keyword dictionaries; synonyms were merged,
  but a few ambiguous Kaggle tokens remain as given (e.g. "Flow", "Word", "CAN").
* 12.7% of postings list no skill and are excluded from skill denominators.

## Salaries

* Only 5.7% of postings advertise a salary (26,236 of them from the 2023 archive; many
  are hourly). Benchmarks (2.5%) are not posting pay and are kept apart.
* Annualization assumes 2,080 hours / 260 days / 52 weeks / 12 months per year.
* Currency conversion uses **fixed approximate rates** (`USD_PER_UNIT`), not
  historical rates on the posting date. Use results for orders of magnitude.
* Cross-country comparisons mix currencies; the comparison studio says so.

## Roles and seniority

* Role category = keyword rules on the title (baseline, FR-10); the ML classifier (WP7)
  is not part of this dashboard. 65% of titles state no seniority.

## Employers

* 17,099 postings name a job board or a hidden employer ("Confidential", Dice, Upwork,
  Emprego …). They are excluded from employer counts and flagged in the directory.

## Missing fields

Descriptions 97.7% missing, URLs 97.1%, salaries 91.8%, cities 25.9%, dates 0.6%,
countries 1.0% (per-source table on the methodology page).

## Text and privacy

Emails and phone numbers were removed by the pipeline (0 remaining, NFR-05). Arabic text
is normalized (diacritics, letter variants) and displayed right-to-left.

## Requirements at risk (project documentation)

| Requirement | Status |
|---|---|
| FR-18–20 role classifier, KPI M1/M2 | Owned by WP7 (other members); not implemented here. The dashboard uses the documented rule-based baseline and states it |
| FR-01–03 live API collection | Collection scripts are not in this repository; the dashboard uses the collected files |
| U1/U2 pilot-user study (5 users, 4 tasks) | Needs real participants; the e2e tests script the four core tasks but do not replace the study |
| NFR-25 second OS run | Developed and tested on Windows; Linux/macOS commands are documented but not executed here |
