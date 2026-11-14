# Graph Report - Business Inteligance  (2026-11-14)

## Corpus Check
- 120 files · ~175,480 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .ico 2, .css 1)

## Summary
- 1271 nodes · 3448 edges · 66 communities (57 shown, 8 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 107 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a93edee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- i18n.ts
- pipeline.py
- test_clean_utils.py
- Series
- Data Quality Report
- clean_utils.py
- get
- Job Market Intelligence & Skills Analytics — DEPI R5 Final Project
- Review Focus
- load
- export_for_viewing.py
- skills.py
- make_demo_data.py
- unhandled
- Compass journey: design
- Components
- roadmaps.ts
- JobDetail.tsx
- salary.py
- useMenu
- package.json
- compilerOptions
- Compare.tsx
- test_integrity_real.py
- dependencies
- devDependencies
- vercel.json
- Modules
- Data limitations and integrity
- Geography.tsx
- Product
- Data catalog
- Metric definitions
- collectors.py
- Design system
- test_roadmap.py
- Store
- t
- Deployment
- Testing and results
- README.md
- app.spec.ts
- builder.py
- Bosla logo — usage guide
- Architecture
- scripts
- ResultCache
- Feature coverage
- Roadmap page: design
- main.py
- world.ts
- frontend.md
- AGENTS.md
- CLAUDE.md
- .cte
- db.py
- Employers.tsx
- Home.tsx
- Review Focus
- Boundary
- .active
- Fresh data sources
- salary_to_usd_annual
- Compass.tsx
- benchmark-ui.mjs

## God Nodes (most connected - your core abstractions)
1. `t()` - 150 edges
2. `fmtInt()` - 73 edges
3. `tv()` - 70 edges
4. `fmtPct()` - 65 edges
5. `get()` - 61 edges
6. `Store` - 57 edges
7. `Filters` - 57 edges
8. `useApi()` - 49 edges
9. `useFilters()` - 45 edges
10. `useProfile()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `test_merged_observed_skills_uses_added_count_suffix()` --calls--> `_merged_observed_skills()`  [INFERRED]
  tests/test_clean_utils.py → src/loaders.py
- `real()` --calls--> `reset_store()`  [EXTRACTED]
  tests/test_integrity_real.py → api/db.py
- `test_core_is_capped_and_overflow_dropped()` --calls--> `assign_stages()`  [EXTRACTED]
  tests/test_roadmap.py → api/queries/roadmap.py
- `test_roadmap_stages_partition_and_fallback()` --calls--> `assign_stages()`  [EXTRACTED]
  tests/test_roadmap.py → api/queries/roadmap.py
- `main()` --calls--> `reset_store()`  [EXTRACTED]
  scripts/benchmark_api.py → api/db.py

## Import Cycles
- None detected.

## Communities (66 total, 8 thin omitted)

### Community 0 - "i18n.ts"
Cohesion: 0.11
Nodes (17): LinkTo, NavItem, NO_FILTERS, TopBar(), SkillPicker(), COUNTRY_CODES, Lang, listeners (+9 more)

### Community 1 - "pipeline.py"
Cohesion: 0.14
Nodes (25): deduplicate(), listings_table(), load_all(), main(), make_job_id(), parse_dates(), DataFrame, Path (+17 more)

### Community 2 - "test_clean_utils.py"
Cohesion: 0.05
Nodes (38): parse_skill_list(), Turn any raw skills cell into a list of lower-case canonical skills. Handles…, _api_board_file(), _finish(), _literal(), load_arab_jobs(), load_cybersecurity(), load_fresh() (+30 more)

### Community 3 - "Series"
Cohesion: 0.13
Nodes (20): assign_market_type(), categorize_role(), _contains(), country_from_location(), infer_seniority(), infer_work_mode(), is_worldwide(), Series (+12 more)

### Community 4 - "Data Quality Report"
Cohesion: 0.17
Nodes (11): Data Quality Report, Known limitations, Language, Market type, Missing values in key fields (% of clean rows), Per source, Posting year, Record counts per pipeline stage (+3 more)

### Community 5 - "clean_utils.py"
Cohesion: 0.14
Nodes (18): Regenerate `KAGGLE_SKILL_TYPES` in src/skill_taxonomy.py. The Kaggle 'data jobs…, clean_title(), detect_language(), normalize_series(), normalize_text(), parse_salary(), platform_family(), Reusable cleaning helpers for the Job Market Intelligence project. Every… (+10 more)

### Community 6 - "get"
Cohesion: 0.06
Nodes (48): builder_options(), spa(), _cell(), Neutralize spreadsheet formulas: employer names such as '+OneX' or '@Orchard'., _coverage(), demo(), get(), fixture (+40 more)

### Community 7 - "Job Market Intelligence & Skills Analytics — DEPI R5 Final Project"
Cohesion: 0.20
Nodes (10): Cleaning rules (summary), Dashboard modules, Data, Documentation, Job Market Intelligence & Skills Analytics — DEPI R5 Final Project, Outputs, Quick start, Repository layout (+2 more)

### Community 8 - "Review Focus"
Cohesion: 0.12
Nodes (15): Compass Journey Implementation Plan, Global Constraints, Out of scope (from the spec), Review Focus, Starting point (verified 2026-11-14), Task 0: Save the other session's work as its own commit (needs your go-ahead), Task 1: Profile remembers where you'd work, Task 2: Match scopes and the dial angle (+7 more)

### Community 9 - "load"
Cohesion: 0.40
Nodes (4): load(), DataFrame, Path, Quick peek at every raw file: row count, and per column the dtype, null %,…

### Community 11 - "skills.py"
Cohesion: 0.16
Nodes (17): Human-readable labels, thresholds and small statistics helpers shared by the…, 95% Wilson score interval for a proportion k/n., Lower bound of the 95% Wilson score interval for a proportion k/n. Used to rank…, salary_confidence(), wilson_interval(), wilson_lower(), assign_stages(), career_roadmap() (+9 more)

### Community 12 - "make_demo_data.py"
Cohesion: 0.18
Nodes (11): generate(), DataFrame, Path, Generate a SMALL, SYNTHETIC dataset with the same schema as the pipeline…, write(), build(), main(), Path (+3 more)

### Community 13 - "unhandled"
Cohesion: 0.33
Nodes (7): raw_rate_limit(), timing(), unhandled(), Exception, exception_handler, middleware, Request

### Community 14 - "Compass journey: design"
Cohesion: 0.20
Nodes (9): Anti-goals (a failure even if it works), Approaches considered, Compass journey: design, Constraints, Decided, Goals, Left to the builder, Non-goals (+1 more)

### Community 15 - "Components"
Cohesion: 0.06
Nodes (31): Buttons, Cards / Containers, Chips, Colors, Compass Dial (signature), Components, Coverage Strip (signature), Design System: Bosla (+23 more)

### Community 16 - "roadmaps.ts"
Cohesion: 0.24
Nodes (6): MAP, roadmapLinks(), skillAnchor(), contrast(), css, luminance()

### Community 17 - "JobDetail.tsx"
Cohesion: 0.18
Nodes (15): CoverageItem, CoverageStrip(), growOf(), Description(), JobDetail(), noCountry(), noEmployer(), PERIODS (+7 more)

### Community 18 - "salary.py"
Cohesion: 0.39
Nodes (7): coverage(), histogram(), _period_clause(), Kind, Salary intelligence. `advertised` = the pay written in the posting (or the…, Quantiles of annualized USD salary, overall and per group of `dim`., salary_summary()

### Community 19 - "useMenu"
Cohesion: 0.32
Nodes (8): barState(), ModeSwitch(), nav(), NavMenu(), TopNav(), useMenu(), setMode(), useMode()

### Community 20 - "package.json"
Cohesion: 0.09
Nodes (20): name, private, type, version, cmdk, echarts, @fontsource-variable/geist, @fontsource-variable/readex-pro (+12 more)

### Community 21 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 22 - "Compare.tsx"
Cohesion: 0.06
Nodes (47): Chart(), ChartHandle, Handler, Button(), ApiError, apiGet(), apiPost(), buildQuery() (+39 more)

### Community 23 - "test_integrity_real.py"
Cohesion: 0.22
Nodes (15): api(), fixture, KPI S1 - dashboard figures vs. an independent calculation on the REAL data.…, real(), test_figure_01_total_postings(), test_figure_02_countries(), test_figure_03_market_type_counts(), test_figure_04_top_countries() (+7 more)

### Community 24 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, clsx, cmdk, echarts, @fontsource-variable/geist, @fontsource-variable/readex-pro, lucide-react, @radix-ui/react-popover (+6 more)

### Community 25 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, @axe-core/playwright, @playwright/test, tailwindcss, @tailwindcss/vite, @types/geojson, @types/node, @types/react (+6 more)

### Community 26 - "vercel.json"
Cohesion: 0.14
Nodes (13): entrypoint, framework, root, framework, rewrites, root, git, deploymentEnabled (+5 more)

### Community 27 - "Modules"
Cohesion: 0.12
Nodes (15): Compare markets, Dashboard features and navigation, Data & methodology, Employers, Geography, Global exploration, Guided insights, Insight builder (+7 more)

### Community 28 - "Data limitations and integrity"
Cohesion: 0.13
Nodes (15): Data limitations and integrity, Employers, Fresh API collection, Geographic imbalance, It is a sample of postings, not the labour market, Job boards ("Where to search", "Also posted on"), Missing fields, One source dominates (+7 more)

### Community 29 - "Geography.tsx"
Cohesion: 0.07
Nodes (46): RouteErrorBoundary(), Advanced(), Callout(), ChartPanel(), csvCell(), ErrorState(), Guard(), PageHeader() (+38 more)

### Community 30 - "Product"
Cohesion: 0.15
Nodes (12): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+4 more)

### Community 31 - "Data catalog"
Cohesion: 0.17
Nodes (12): 1. Sources, 2. Tables, 3. Relationships, 4. Coverage, 5. Analytical use cases supported, 6. Data that cannot be used responsibly (and how the dashboard treats it), Data catalog, `job_listings.csv` → store table `job_listings` (one row per posting × platform) (+4 more)

### Community 32 - "Metric definitions"
Cohesion: 0.13
Nodes (15): Career planner, Comparison studio, Counts, Employer report card, Geography, Guided insights, Insight builder, Metric definitions (+7 more)

### Community 33 - "collectors.py"
Cohesion: 0.06
Nodes (51): add_skills(), arbeitnow(), ashby(), collect(), epoch(), fetch_json(), greenhouse(), himalayas() (+43 more)

### Community 34 - "Design system"
Cohesion: 0.17
Nodes (11): Accessibility, Charts, Colour, Components, Data colours (qamariyya stained glass), Design system, Direction, Interaction patterns (+3 more)

### Community 35 - "test_roadmap.py"
Cohesion: 0.26
Nodes (13): excluded(), market_premium(), Pay premium of a skill over its role, compared market by market. premium =…, cell(), names(), Pure roadmap helpers: stage assignment and within-market pay premium., row(), test_core_is_capped_and_overflow_dropped() (+5 more)

### Community 36 - "Store"
Cohesion: 0.11
Nodes (45): Store, Filters, BaseModel, Extra condition on job_skills rows for skill metrics., Copy with some filters reset, e.g. to compute a chart's own breakdown., share(), insights(), compare() (+37 more)

### Community 37 - "t"
Cohesion: 0.05
Nodes (149): ADDED(), BarDatum, CohortMonths(), Handle, HBar(), Histogram(), LineSeries, MonthLines() (+141 more)

### Community 38 - "Deployment"
Cohesion: 0.20
Nodes (9): Configuration, Deployment, Development mode (hot reload), Hosted option (only with the data owners' agreement), If `data/processed/` is locked, Local (recommended for the DEPI demo), Rebuilding after data changes, Vercel (real store, deployed from the CLI) (+1 more)

### Community 39 - "Testing and results"
Cohesion: 0.20
Nodes (10): Analytics integrity (KPI S1), API (real store, `python scripts/benchmark_api.py --runs 5`), End-to-end scenarios, Independent reviews, Not covered, Performance, Pipeline, Summary (+2 more)

### Community 40 - "README.md"
Cohesion: 0.21
Nodes (5): Competitors and next features, Proposed next features (need approval), Shipped in this round, The data gap to fix before anything else, What job seekers in Egypt and the Gulf use today

### Community 41 - "app.spec.ts"
Cohesion: 0.18
Nodes (4): ROUTES, routes, @axe-core/playwright, @playwright/test

### Community 42 - "builder.py"
Cohesion: 0.16
Nodes (19): builder_csv(), builder_run(), compare_view(), CompareRequest, BaseModel, BuilderRequest, _metric_sql(), _pct() (+11 more)

### Community 43 - "Bosla logo — usage guide"
Cohesion: 0.25
Nodes (7): Bosla logo — usage guide, Colour, Construction, Files (`final/`), In the product, Open items, Rules

### Community 44 - "Architecture"
Cohesion: 0.29
Nodes (7): Architecture, Backend layout, Decisions, Flow, Front-end layout, Performance (measured), Security and reliability

### Community 45 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, e2e, preview, test, typecheck

### Community 46 - "ResultCache"
Cohesion: 0.22
Nodes (4): Any, Thread-safe LRU keyed by (endpoint, normalized parameters)., ResultCache, DuckDBPyConnection

### Community 47 - "Feature coverage"
Cohesion: 0.33
Nodes (5): 1. Project requirements (Project Documentation, section 3), 2. Brief modules (A–L), 3. Data-to-feature coverage matrix, 4. Deliberately excluded or partial, Feature coverage

### Community 48 - "Roadmap page: design"
Cohesion: 0.15
Nodes (12): Anti-goals (a failure even if it works), API, Exclude list, Goals, Left to the builder, Non-goals, Roadmap page: design, roadmap.sh links (+4 more)

### Community 49 - "main.py"
Cohesion: 0.19
Nodes (36): get_store(), breakdown(), cached(), career_gap(), career_roadmap(), companies(), company_profile(), crosstab() (+28 more)

### Community 50 - "world.ts"
Cohesion: 0.40
Nodes (4): ALIASES, loadWorld(), mapName(), topojson-client

### Community 56 - "db.py"
Cohesion: 0.10
Nodes (15): Path, Read-only access to the DuckDB analytical store + a small result cache. The…, Used by tests to point the API at a different store., Allowed values of every low-cardinality filter (validated on input)., reset_store(), filters_from_query(), date, Query (+7 more)

### Community 57 - "Employers.tsx"
Cohesion: 0.09
Nodes (30): IconButton(), CategoryRow, CoLink, Cooc, Count, GapSkill, Insight, Kpis (+22 more)

### Community 58 - "Home.tsx"
Cohesion: 0.23
Nodes (14): at(), CompassDial(), AlsoPostedOn(), Segmented(), advertRel(), fmtDate(), isWebLink(), nf() (+6 more)

### Community 59 - "Review Focus"
Cohesion: 0.29
Nodes (6): Global Constraints, Review Focus, Roadmap Page Implementation Plan, Task 1: Pure roadmap helpers, Task 2: Roadmap query and endpoint, Task 3: Roadmap page

### Community 62 - "Fresh data sources"
Cohesion: 0.40
Nodes (5): Checked and not used, Fresh data sources, Off by default, Rules for the dashboard, Sources used by default (no key)

### Community 64 - "salary_to_usd_annual"
Cohesion: 0.67
Nodes (3): DataFrame, Mid-point of min/max, annualized and converted to USD. Values outside 500 -…, salary_to_usd_annual()

### Community 66 - "Compass.tsx"
Cohesion: 0.14
Nodes (21): Empty(), InfoTip(), Filters, LOCATION_KEYS, MatchScope, Recency, base, broaderWhere() (+13 more)

## Knowledge Gaps
- **339 isolated node(s):** `Overview`, `Primary`, `Secondary (semantic: you)`, `Tertiary (categorical, multi-series only)`, `Neutral` (+334 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 555 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `i18n.ts`, `Compass.tsx`, `JobDetail.tsx`, `useMenu`, `Compare.tsx`, `Employers.tsx`, `Home.tsx`, `Boundary`, `Geography.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Filters` connect `Store` to `builder.py`, `skills.py`, `main.py`, `salary.py`, `.cte`, `db.py`, `.active`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `react` connect `i18n.ts` to `Compass.tsx`, `t`, `JobDetail.tsx`, `package.json`, `Compare.tsx`, `Employers.tsx`, `Home.tsx`, `Geography.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `tv()` (e.g. with `list()` and `Chip()`) actually correct?**
  _`tv()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Overview`, `Primary`, `Secondary (semantic: you)` to the rest of the system?**
  _339 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `i18n.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._
- **Should `pipeline.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._