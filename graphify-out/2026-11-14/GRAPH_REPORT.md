# Graph Report - Business Inteligance  (2026-11-14)

## Corpus Check
- 120 files · ~174,804 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .ico 2, .css 1)

## Summary
- 1262 nodes · 3406 edges · 74 communities (60 shown, 12 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `39f97833`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- market.py
- pipeline.py
- test_clean_utils.py
- Series
- Data Quality Report
- clean_utils.py
- get
- Job Market Intelligence & Skills Analytics — DEPI R5 Final Project
- tv
- load
- export_for_viewing.py
- roadmap.py
- make_demo_data.py
- unhandled
- Compass journey: design
- Components
- Salary.tsx
- Geography.tsx
- compare_view
- FilterBar.tsx
- package.json
- compilerOptions
- Compare.tsx
- test_integrity_real.py
- dependencies
- devDependencies
- vercel.json
- Modules
- Data limitations and integrity
- main.tsx
- Product
- Data catalog
- Metric definitions
- collectors.py
- Design system
- test_roadmap.py
- Filters
- fmtInt
- Deployment
- Testing and results
- app.spec.ts
- builder.py
- Bosla logo — usage guide
- Architecture
- scripts
- Store
- Feature coverage
- Roadmap page: design
- main.py
- echarts.ts
- frontend.md
- AGENTS.md
- CLAUDE.md
- Boundary
- salary.py
- types.ts
- t
- Review Focus
- fmtPct
- Competitors and next features
- Fresh data sources
- usePost
- salary_to_usd_annual
- filters.ts
- vite.config.ts
- .cte
- BaseModel
- Kind
- Query
- date
- fixture
- benchmark-ui.mjs

## God Nodes (most connected - your core abstractions)
1. `t()` - 144 edges
2. `fmtInt()` - 73 edges
3. `tv()` - 70 edges
4. `fmtPct()` - 65 edges
5. `get()` - 61 edges
6. `useApi()` - 49 edges
7. `useFilters()` - 45 edges
8. `Store` - 41 edges
9. `Filters` - 40 edges
10. `useProfile()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `demo()` --calls--> `build()`  [INFERRED]
  tests/test_api.py → src/build_analytics.py
- `test_merged_observed_skills_uses_added_count_suffix()` --calls--> `_merged_observed_skills()`  [INFERRED]
  tests/test_clean_utils.py → src/loaders.py
- `demo()` --calls--> `reset_store()`  [EXTRACTED]
  tests/test_api.py → api/db.py
- `builder_options()` --references--> `get()`  [EXTRACTED]
  api/main.py → tests/test_api.py
- `meta()` --references--> `get()`  [EXTRACTED]
  api/main.py → tests/test_api.py

## Import Cycles
- None detected.

## Communities (74 total, 12 thin omitted)

### Community 0 - "market.py"
Cohesion: 0.29
Nodes (16): _attach_skills(), breakdown(), companies(), company_profile(), crosstab(), job_detail(), kpis(), list_jobs() (+8 more)

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
Nodes (47): builder_options(), health(), job(), spa(), fixture, _coverage(), demo(), get() (+39 more)

### Community 7 - "Job Market Intelligence & Skills Analytics — DEPI R5 Final Project"
Cohesion: 0.20
Nodes (10): Cleaning rules (summary), Dashboard modules, Data, Documentation, Job Market Intelligence & Skills Analytics — DEPI R5 Final Project, Outputs, Quick start, Repository layout (+2 more)

### Community 8 - "tv"
Cohesion: 0.19
Nodes (16): Band(), PayLands(), list(), fmtUsd(), COUNTRY_CODES, countryCode(), Lang, listeners (+8 more)

### Community 9 - "load"
Cohesion: 0.40
Nodes (4): load(), DataFrame, Path, Quick peek at every raw file: row count, and per column the dtype, null %,…

### Community 11 - "roadmap.py"
Cohesion: 0.14
Nodes (15): Human-readable labels, thresholds and small statistics helpers shared by the…, 95% Wilson score interval for a proportion k/n., Lower bound of the 95% Wilson score interval for a proportion k/n. Used to rank…, wilson_interval(), wilson_lower(), Filters, Store, Where postings are listed: per-platform coverage of a segment ("Where should I… (+7 more)

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
Cohesion: 0.07
Nodes (28): Buttons, Cards / Containers, Chips, Colors, Components, Coverage Strip (signature), Design System: Bosla, Do: (+20 more)

### Community 16 - "Salary.tsx"
Cohesion: 0.12
Nodes (36): ADDED(), BarDatum, CohortMonths(), Handle, Histogram(), LineSeries, MonthLines(), SkillBars() (+28 more)

### Community 17 - "Geography.tsx"
Cohesion: 0.08
Nodes (34): Button(), Callout(), ChartPanel(), csvCell(), DataTable(), IconButton(), InfoTip(), Panel() (+26 more)

### Community 18 - "compare_view"
Cohesion: 0.50
Nodes (4): compare_view(), CompareRequest, BaseModel, Body

### Community 19 - "FilterBar.tsx"
Cohesion: 0.20
Nodes (12): ActiveChips(), AsyncFacet(), Facet(), facetLabel(), facets(), groupBy(), more(), MoreFilters() (+4 more)

### Community 20 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, type, version, cmdk, echarts, @fontsource-variable/geist, @fontsource-variable/readex-pro (+11 more)

### Community 21 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 22 - "Compare.tsx"
Cohesion: 0.13
Nodes (16): filterBody(), SalaryStats, Compare, Compare(), currentSegment(), EDIT_DIMS, groupWords(), MetricRow (+8 more)

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
Nodes (15): Career planner, Compare markets, Dashboard features and navigation, Data & methodology, Employers, Geography, Global exploration, Guided insights (+7 more)

### Community 28 - "Data limitations and integrity"
Cohesion: 0.13
Nodes (15): Data limitations and integrity, Employers, Fresh API collection, Geographic imbalance, It is a sample of postings, not the labour market, Job boards ("Where to search", "Also posted on"), Missing fields, One source dominates (+7 more)

### Community 29 - "main.tsx"
Cohesion: 0.06
Nodes (43): RouteErrorBoundary(), barState(), Brand(), JobSearch(), LinkTo, ModeSwitch(), nav(), NavItem (+35 more)

### Community 30 - "Product"
Cohesion: 0.15
Nodes (12): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+4 more)

### Community 31 - "Data catalog"
Cohesion: 0.17
Nodes (12): 1. Sources, 2. Tables, 3. Relationships, 4. Coverage, 5. Analytical use cases supported, 6. Data that cannot be used responsibly (and how the dashboard treats it), Data catalog, `job_listings.csv` → store table `job_listings` (one row per posting × platform) (+4 more)

### Community 32 - "Metric definitions"
Cohesion: 0.14
Nodes (14): Career planner, Comparison studio, Counts, Employer report card, Geography, Guided insights, Insight builder, Metric definitions (+6 more)

### Community 33 - "collectors.py"
Cohesion: 0.06
Nodes (51): date, add_skills(), arbeitnow(), ashby(), collect(), epoch(), fetch_json(), greenhouse() (+43 more)

### Community 34 - "Design system"
Cohesion: 0.17
Nodes (11): Accessibility, Charts, Colour, Components, Data colours (qamariyya stained glass), Design system, Direction, Interaction patterns (+3 more)

### Community 35 - "test_roadmap.py"
Cohesion: 0.26
Nodes (13): excluded(), market_premium(), Pay premium of a skill over its role, compared market by market. premium =…, cell(), names(), Pure roadmap helpers: stage assignment and within-market pay premium., row(), test_core_is_capped_and_overflow_dropped() (+5 more)

### Community 36 - "Filters"
Cohesion: 0.09
Nodes (37): Filters, filters_from_query(), BaseModel, date, Query, The global filter set shared by every analytical endpoint. Filters arrive as…, Extra condition on job_skills rows for skill metrics., Only the filters that differ from the defaults (for display/provenance). (+29 more)

### Community 37 - "fmtInt"
Cohesion: 0.18
Nodes (37): Population(), Match(), KeyPoints(), useApi(), drillHref(), fmtInt(), useFilters(), useParam() (+29 more)

### Community 38 - "Deployment"
Cohesion: 0.20
Nodes (9): Configuration, Deployment, Development mode (hot reload), Hosted option (only with the data owners' agreement), If `data/processed/` is locked, Local (recommended for the DEPI demo), Rebuilding after data changes, Vercel (real store, deployed from the CLI) (+1 more)

### Community 39 - "Testing and results"
Cohesion: 0.20
Nodes (10): Analytics integrity (KPI S1), API (real store, `python scripts/benchmark_api.py --runs 5`), End-to-end scenarios, Independent reviews, Not covered, Performance, Pipeline, Summary (+2 more)

### Community 41 - "app.spec.ts"
Cohesion: 0.18
Nodes (4): ROUTES, routes, @axe-core/playwright, @playwright/test

### Community 42 - "builder.py"
Cohesion: 0.14
Nodes (22): builder_csv(), builder_run(), BuilderRequest, _cell(), insights(), _metric_sql(), _pct(), BaseModel (+14 more)

### Community 43 - "Bosla logo — usage guide"
Cohesion: 0.25
Nodes (7): Bosla logo — usage guide, Colour, Construction, Files (`final/`), In the product, Open items, Rules

### Community 44 - "Architecture"
Cohesion: 0.29
Nodes (7): Architecture, Backend layout, Decisions, Flow, Front-end layout, Performance (measured), Security and reliability

### Community 45 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, e2e, preview, test, typecheck

### Community 46 - "Store"
Cohesion: 0.12
Nodes (14): Any, Path, Read-only access to the DuckDB analytical store + a small result cache. The…, Used by tests to point the API at a different store., Allowed values of every low-cardinality filter (validated on input)., Thread-safe LRU keyed by (endpoint, normalized parameters)., reset_store(), ResultCache (+6 more)

### Community 47 - "Feature coverage"
Cohesion: 0.33
Nodes (5): 1. Project requirements (Project Documentation, section 3), 2. Brief modules (A–L), 3. Data-to-feature coverage matrix, 4. Deliberately excluded or partial, Feature coverage

### Community 48 - "Roadmap page: design"
Cohesion: 0.15
Nodes (12): Anti-goals (a failure even if it works), API, Exclude list, Goals, Left to the builder, Non-goals, Roadmap page: design, roadmap.sh links (+4 more)

### Community 49 - "main.py"
Cohesion: 0.20
Nodes (35): get_store(), breakdown(), cached(), career_gap(), career_roadmap(), companies(), company_profile(), crosstab() (+27 more)

### Community 50 - "echarts.ts"
Cohesion: 0.16
Nodes (15): Chart(), ChartHandle, Handler, each(), flipBox(), mirror(), Opt, readTokens() (+7 more)

### Community 56 - "salary.py"
Cohesion: 0.36
Nodes (8): salary_confidence(), coverage(), histogram(), _period_clause(), Kind, Salary intelligence. `advertised` = the pay written in the posting (or the…, Quantiles of annualized USD salary, overall and per group of `dim`., salary_summary()

### Community 57 - "types.ts"
Cohesion: 0.08
Nodes (28): CategoryRow, CoLink, Cooc, CountryRow, GapSkill, Geo, Insight, Job (+20 more)

### Community 58 - "t"
Cohesion: 0.09
Nodes (49): CoverageItem, CoverageStrip(), growOf(), OptionRow(), About(), AlsoPostedOn(), Description(), Facts() (+41 more)

### Community 59 - "Review Focus"
Cohesion: 0.29
Nodes (6): Global Constraints, Review Focus, Roadmap Page Implementation Plan, Task 1: Pure roadmap helpers, Task 2: Roadmap query and endpoint, Task 3: Roadmap page

### Community 60 - "fmtPct"
Cohesion: 0.14
Nodes (25): HBar(), Lattice(), Guard(), PageHeader(), WhereToSearch(), fmtDate(), fmtPct(), fmtPp() (+17 more)

### Community 61 - "Competitors and next features"
Cohesion: 0.40
Nodes (5): Competitors and next features, Proposed next features (need approval), Shipped in this round, The data gap to fix before anything else, What job seekers in Egypt and the Gulf use today

### Community 62 - "Fresh data sources"
Cohesion: 0.40
Nodes (5): Checked and not used, Fresh data sources, Off by default, Rules for the dashboard, Sources used by default (no key)

### Community 63 - "usePost"
Cohesion: 0.40
Nodes (4): ApiError, apiPost(), handle(), usePost()

### Community 64 - "salary_to_usd_annual"
Cohesion: 0.67
Nodes (3): DataFrame, Mid-point of min/max, annualized and converted to USD. Values outside 500 -…, salary_to_usd_annual()

### Community 66 - "filters.ts"
Cohesion: 0.06
Nodes (40): at(), CompassDial(), activeCount(), EMPTY_FILTERS, FilterKey, Filters, isFilterKey(), LIST_KEYS (+32 more)

### Community 69 - "vite.config.ts"
Cohesion: 0.40
Nodes (3): @tailwindcss/vite, vite, @vitejs/plugin-react

## Knowledge Gaps
- **324 isolated node(s):** `ROUTES`, `Segment`, `Result`, `Side`, `PRESETS` (+319 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 546 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `filters.ts`, `fmtInt`, `tv`, `Salary.tsx`, `Geography.tsx`, `FilterBar.tsx`, `Compare.tsx`, `Boundary`, `fmtPct`, `main.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `get()` connect `get` to `main.py`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `tv()` (e.g. with `list()` and `Compass()`) actually correct?**
  _`tv()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ROUTES`, `Segment`, `Result` to the rest of the system?**
  _324 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pipeline.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `test_clean_utils.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05202661826981246 - nodes in this community are weakly interconnected._