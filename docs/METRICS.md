# Metric definitions

Every number in the dashboard is computed live by the API (`api/queries/`) from the
analytical store, for the population defined by the current filters. Thresholds live in
`api/labels.py`.

## Populations and filters

* **Population** = postings matching all active filters. List filters combine with OR
  inside a filter and AND across filters (`country=Egypt&country=Qatar&role=Mobile`
  = (Egypt or Qatar) and Mobile).
* **Skill filter** = postings that list **all** selected skills. With the
  "Written in posting" switch (`provenance=observed`) only skills written in the posting
  data count, both for this filter and for every skill metric.
* **Date filter** excludes undated postings (3,723) whenever a date bound is set.
* **Keyword search** (`q`) matches title or employer, case-insensitive; `%` and `_`
  are escaped.
* **Salary filter** `salary=advertised` keeps postings with a usable advertised salary.

## Counts

| Metric | Definition |
|---|---|
| Unique postings | Rows of the de-duplicated dataset in the population |
| Listings | `sum(duplicate_count)`: every board appearance before de-duplication |
| Employers | Distinct `company` excluding job boards / hidden employers (`company_is_placeholder`) |
| Countries | Distinct non-null `country` |
| Distinct skills | Distinct skills in `job_skills` for the population (provenance mode applies) |

## Shares

| Metric | Numerator | Denominator |
|---|---|---|
| Share of postings (roles, markets, countries …) | postings in the group | postings in the population |
| **Skill share** | postings in the population listing the skill | postings in the population listing **at least one** skill (same provenance mode). Postings without skill data are excluded, never counted as "skill absent". |
| Skill share within a group (lattice, matrices, skill profile) | postings in the group listing the skill | postings in the group listing any skill |
| Category share | postings listing ≥ 1 skill of the category | postings listing any skill |
| Written / added split | postings where the skill is observed / added | same denominator as the skill share |

Groups with fewer than **30** postings-with-skills are flagged (dashed lattice frame,
"small" pill) or hidden from rankings (UC-03/UC-04 alternative flows).

## Skill associations

For skills A and B among the top N in the population (N postings-with-skills = *n*):

* together = postings listing both
* **Jaccard** = together ÷ (A + B − together)
* **P(B | A)** = together ÷ A
* **Lift** = together × n ÷ (A × B) — 1 means no association; ≥ 2 is drawn as a strong pair; < 0.8 as "avoid each other"

The pairing network draws edges with lift ≥ 1.5 and together ≥ 1% of *n*.

## Salaries

* **Advertised** = the posting's own salary (`salary_kind = 'advertised'`).
  **Benchmark** = a market figure the team attached (`'benchmark'`). Every salary
  endpoint takes exactly one `kind`; the two are never pooled.
* `salary_usd_annual` = midpoint of min/max × periods per year (hour 2080, day 260,
  week 52, month 12, year 1) × a **fixed approximate** USD rate
  (`clean_utils.USD_PER_UNIT`). Values outside $500–$1,000,000 are discarded as parse
  errors (`*_unusable` kinds).
* Statistics: n, P10, P25, median, P75, P90, mean, number of currencies. Boxplots use
  whiskers = P10–P90.
* Groups need **≥ 10** salaries to be shown; **10–29** are marked low confidence (dashed box).
* "Stated per" restricts to salaries quoted per year / month / hour before annualization.

## Time

* Cohort `kaggle_2023` = Kaggle sources; `collected_2026` = every other source.
* Monthly series are computed **within one cohort**; months with < 30 postings-with-skills
  are not plotted.
* **Half-year change (2023)**: skill share Jul–Dec minus Jan–Jun, in percentage points,
  within the 2023 archive only.
* Cohort comparison = top skills of each cohort side by side. No growth rate is computed.

## Comparison studio

Each segment is its own population; all shares use the segment's own denominator.
A skill "appears mainly in A" when share A ≥ 2 × share B **and** A − B ≥ 5 pp.
Warnings: segment < 30 postings-with-skills (ranking hidden), < 30 salaries (indicative)
or < 10 (hidden), salaries converted from several currencies, segments dominated by
different cohorts (≥ 50% each), segments with no common major source (≥ 20%).

## Career planner

For a target role in the chosen market (other filters apply too):

* Skills ranked by share among the role's postings with skills (top 40); missing skills
  are listed in the same order ("what to learn next").
* Each share is shown with the lower bound of its 95% Wilson score interval ("at least X%").
  Within one role every skill has the same denominator, so this bound does not change the
  order; it states how precisely the share is known for the selected population.
* **Alignment** = Σ share of the top-15 skills the user has ÷ Σ share of the top-15 skills.
  A descriptive overlap score, **not** a hiring probability, not validated against outcomes.
* **Posting match**: share of the role's postings where the user has all / at least half /
  at least one of the listed skills.
* **Adjacent roles** = cosine similarity between roles' share vectors over the 60 most
  requested skills (roles with ≥ 30 postings-with-skills).
* A skill whose mentions are > 50% team-added is flagged "mostly team-added".

## Geography

* Concentration: top-3 share and HHI = Σ (country share)² over postings with a country.
* Map metrics: postings (log colour scale), remote share, median advertised salary (n ≥ 10).

## Insight builder

Dimensions and metrics are whitelisted (`api/queries/builder.py`). Metrics: postings,
share, distinct employers, median advertised salary, advertised-salary coverage, remote
share, average skills per posting that lists skills. The **share** denominator follows the
grouping and is named in the response (`metric_label`):

| Grouping | Share = |
|---|---|
| one posting dimension | postings in the group ÷ all postings |
| two posting dimensions | postings in (main, split) ÷ postings in the main group (rows sum to 100%) |
| skill dimension alone | postings listing the skill ÷ postings with skills |
| skill + posting dimension | postings in the group listing the skill ÷ the group's postings with skills |

Skill categories count each posting once per category.
Rejected: two skill dimensions together; posting-level metrics split by skill. Warned:
time axes spanning both cohorts; salary medians; skill counts including added skills.

## Guided insights

Template sentences whose every number is the value returned by the same queries
(top skill share, top-two comparison, team-added share, top role, remote share — skipped
when a non-remote market is selected, salary median with its currency caveat or its
insufficiency, geographic concentration, strongest pairing by lift computed on
posting-written skills only with together ≥ max(30, 2% of postings), cohort mix). No language model generates text or numbers.
