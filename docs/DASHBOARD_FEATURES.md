# Dashboard features and navigation

The left rail groups twelve modules by what the visitor is doing. The filter bar above
every filter-aware page defines the population; the line under it always states how many
unique postings are in view, their collection mix and how skills are being counted.

| Group | Module | Route | Answers |
|---|---|---|---|
| Explore | Overview | `/` | How big is the selection, which roles/skills/places/pay dominate it? |
| | Job explorer | `/explorer` | Which postings match, and what does each one ask for? |
| | Geography | `/geography` | Where are the postings, how remote-friendly and how well paid is each market? |
| | Employers | `/employers` | Who posts these jobs, where and asking for what? |
| Analyze | Skills | `/skills` | What is requested, by whom, and which skills travel together? |
| | Salaries | `/salary` | What pay is actually advertised, and how does it vary? |
| | Time & cohorts | `/trends` | How did demand move within 2023, and how do the two collections differ? |
| | Compare markets | `/compare` | How do two segments differ, normalized and with warnings? |
| Plan | Career planner | `/career` | What should I learn next for a target role and market? |
| | Guided insights | `/insights` | What stands out in this selection, in plain sentences? |
| | Insight builder | `/builder` | Let me build my own aggregate view and export it |
| Trust | Data & methodology | `/quality` | How was this built and what can it not tell me? |

## Global exploration

* **Filters**: market, country (grouped Arab League / other), role, seniority, skills
  (server-side search, must have all), collection, source; "More": region, employment
  type, work mode, employer (server-side search), posting date range, advertised-salary
  only. Keyword search on title and employer (debounced).
* **Provenance switch**: "All skills" vs "Written in posting" — applies to every skill
  count, share, filter and denominator.
* **Applied-filter chips** with remove buttons and "Reset filters".
* **URL state**: every filter and page-local choice (tab, sort, page, selected posting,
  skill profile, comparison segments) is in the URL — links are shareable and the back
  button works. Filters survive moving between modules; page counters reset when filters change.
* **Drilldowns**: bars, lattice cells, map countries, heatmap cells and table rows open the
  matching postings (the drilled facet is narrowed to the clicked value; skills are added).
* **Every chart panel**: title, population/denominator line, "how this is calculated" popover
  where relevant, a table view, PNG download of the chart and CSV download of the aggregate.
* **States**: skeletons while loading, previous result dimmed while refetching, error with
  retry, empty state with a recovery hint, small-sample flags, a route-level error boundary.
* **Themes**: light and dark, each designed (not inverted); remembers the choice; follows
  the OS by default. Reduced motion respected (CSS and charts).
* **Responsive**: rail becomes a menu, facets fold behind "Filters" on phones, tables become
  lists, the lattice scrolls sideways with sticky row labels.

## Modules

### Overview
KPI strip (unique postings vs listings before de-duplication, countries, named employers,
distinct skills and coverage, advertised salaries vs benchmarks kept apart, posting-date
span; changed figures keep a dot after a filter edit) · one-line sample caveat · postings by
role · most requested skills (written vs team-added) · **the lattice** (10 largest roles ×
16 most requested skills; aperture area = share; keyboard grid; click to drill) · top
countries, market type, work mode, seniority, employment type · advertised salary histogram ·
postings per month as two small multiples (one per collection) · skill categories · sources.

### Job explorer
Server-side search, every filter, seven sorts (newest, oldest, highest/lowest advertised
salary, listed on most boards, title, employer), 25 per page (first 10,000 results
browsable), result count. Each row: title, employer (job boards flagged), location, market
and work mode, role, seniority, employment type, advertised salary (benchmarks labelled),
date, source, first skills (written = filled chip, added = dashed). Detail panel (`?job=`):
all attributes, salary as stated and annualized, skill provenance counts, description
(RTL-aware), sources the posting was found on, original link.

### Skills intelligence
*Demand*: top 30 skills with written/added split, category filter, technical vs soft-skill
toggle, skill categories, soft skills and languages. *By segment*: the lattice for role,
market, seniority, country, region, employment type or collection. *Pairings*: heatmap of
lift / P(column|row) / Jaccard for the 18 top skills, force network of strong pairs, pairs
table. *Skill profile* (`?view=`): share and provenance, share by role / country / seniority,
most paired skills with lift, top employers, advertised pay with vs without the skill (with
an association-not-causation note), monthly share within 2023.

### Salary lab
Advertised vs benchmark switch (benchmark view carries a warning banner); period filter
(year / month / hour as stated); coverage KPIs; boxplots (P10–P90 whiskers, n labels,
dashed = low confidence, groups < 10 hidden and counted) by role, country, seniority,
employment type, work mode, market, top skills, employer or source; distribution;
original currencies; coverage by source; stated periods. Method callout explains
annualization and fixed exchange rates.

### Geography
Choropleth (postings on a log scale, remote share, or median advertised pay with n ≥ 10;
hatched = < 30 postings); concentration KPIs (top-3 share, HHI); sortable country table;
Arab League breakdown; role mix in the 15 largest countries; the "Sudan" correction note.

### Employers
Directory (search, sort by postings / pay / recency / name, job boards and hidden employers
excluded by default, unique postings vs listings). Profile (`?name=`): KPIs, most advertised
titles, countries, seniority, requested skills, link to its postings; warning when the name
is a job board.

### Time & cohorts
Cohort cards; monthly skill-share lines within the 2023 archive (add up to six skills);
Jan–Jun vs Jul–Dec 2023 change in percentage points; 2024–26 postings by month with
"used for trends" flags; top skills of each collection side by side; explicit statement of
what is not shown (cross-cohort growth, forecasts).

### Compare markets
Two segment editors (market, country, role, seniority, work mode, collection, a required
skill) and presets (Egypt vs United States, Arab vs International, data analyst vs data
scientist, Python vs SQL, Junior vs Senior, Remote vs On-site, 2023 archive vs 2024–26).
Warnings first (too few postings, small or mixed-currency salaries, different collections,
different sources, different skill counting); side-by-side metrics with differences; skill
dumbbell chart with gaps in pp and "mainly in A/B"; role and seniority mix.

### Career planner
Target role, market and current skills (searchable picker; URL `?target=&have=`). Shows
skill alignment (share-weighted coverage of the top 15, with its formula and limits),
postings already matched (all / half / one listed skill), what to learn next (ranked, with
"at least X%" bounds and "mostly team-added" flags), all requested skills, adjacent roles
(cosine similarity of skill profiles, plus your alignment with each) and the
closest-matching postings with their missing skills. Too-small populations get the UC-04
alternative flow ("broaden the filters").

### Guided insights
Template sentences computed from the same queries as the charts, each with n, denominator,
filters, provenance mode and an "Investigate" link to the module that shows the evidence.

### Insight builder
Group by (role, country, region, market, seniority, employment type, work mode, source,
collection, language, posting month/year, employer, skill, skill category), optional split,
measure (postings, share, employers, median advertised salary, salary coverage, remote
share, average skills); invalid combinations are disabled with the reason; warnings for
time axes across collections, salary medians and team-added skills; bar/line/table views;
server-side CSV export of the aggregate.

### Data & methodology
Pipeline stage counts, de-duplication method, collections, per-source raw → kept rows,
dates, advertised vs benchmark salaries, share of skills written in posting, missing-field
heat table, skill provenance and taxonomy sources, salary provenance, the Sudan correction
before/after, metric definitions, and what the data can and cannot show.
