# Graph Report - Business Inteligance  (2026-10-29)

## Corpus Check
- 104 files · ~528,279 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .ico 2, .css 1)

## Summary
- 1088 nodes · 2933 edges · 63 communities (51 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86994cb2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Store
- pipeline.py
- test_clean_utils.py
- Series
- Data Quality Report
- clean_utils.py
- get
- Job Market Intelligence & Skills Analytics — DEPI R5 Final Project
- fmtInt
- load
- export_for_viewing.py
- profile.ts
- build_analytics.py
- main.py
- unhandled
- Components
- ui.tsx
- t
- Boundary
- types.ts
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
- make_demo_data.py
- Design system
- test_roadmap.py
- Filters
- tv
- Deployment
- Testing and results
- README.md
- @playwright/test
- run
- Bosla logo — usage guide
- Architecture
- scripts
- db.py
- Feature coverage
- Roadmap page: design
- vite.config.ts
- Geography.tsx
- frontend.md
- AGENTS.md
- CLAUDE.md
- Skills.tsx
- Insights.tsx
- BaseModel
- Kind
- Review Focus
- Query
- fixture
- parametrize

## God Nodes (most connected - your core abstractions)
1. `t()` - 126 edges
2. `fmtInt()` - 63 edges
3. `tv()` - 62 edges
4. `fmtPct()` - 54 edges
5. `get()` - 53 edges
6. `Store` - 50 edges
7. `Filters` - 48 edges
8. `useApi()` - 42 edges
9. `useFilters()` - 42 edges
10. `useLabels()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `test_merged_observed_skills_uses_added_count_suffix()` --calls--> `_merged_observed_skills()`  [INFERRED]
  tests/test_clean_utils.py → src/loaders.py
- `health()` --references--> `get()`  [EXTRACTED]
  api/main.py → tests/test_api.py
- `meta()` --references--> `get()`  [EXTRACTED]
  api/main.py → tests/test_api.py
- `overview()` --references--> `get()`  [EXTRACTED]
  api/main.py → tests/test_api.py
- `breakdown()` --references--> `get()`  [EXTRACTED]
  api/main.py → tests/test_api.py

## Import Cycles
- None detected.

## Communities (63 total, 11 thin omitted)

### Community 0 - "Store"
Cohesion: 0.12
Nodes (38): Store, Human-readable labels, thresholds and small statistics helpers shared by the…, salary_confidence(), share(), insights(), _pct(), Interactive Insight Builder + guided insights. The builder only combines…, compare() (+30 more)

### Community 1 - "pipeline.py"
Cohesion: 0.15
Nodes (23): deduplicate(), load_all(), main(), make_job_id(), parse_dates(), DataFrame, Path, Series (+15 more)

### Community 2 - "test_clean_utils.py"
Cohesion: 0.05
Nodes (35): parse_skill_list(), Turn any raw skills cell into a list of lower-case canonical skills. Handles…, _api_board_file(), _finish(), _literal(), load_arab_jobs(), load_cybersecurity(), load_international() (+27 more)

### Community 3 - "Series"
Cohesion: 0.13
Nodes (20): assign_market_type(), categorize_role(), _contains(), country_from_location(), infer_seniority(), infer_work_mode(), is_worldwide(), Series (+12 more)

### Community 4 - "Data Quality Report"
Cohesion: 0.17
Nodes (11): Data Quality Report, Known limitations, Language, Market type, Missing values in key fields (% of clean rows), Per source, Posting year, Record counts per pipeline stage (+3 more)

### Community 5 - "clean_utils.py"
Cohesion: 0.12
Nodes (19): Regenerate `KAGGLE_SKILL_TYPES` in src/skill_taxonomy.py. The Kaggle 'data jobs…, clean_title(), detect_language(), normalize_series(), normalize_text(), parse_salary(), DataFrame, Reusable cleaning helpers for the Job Market Intelligence project. Every… (+11 more)

### Community 6 - "get"
Cohesion: 0.07
Nodes (37): builder_options(), spa(), fixture, parametrize, demo(), get(), API contract + analytics tests on the SYNTHETIC demo store. Every metric is…, skill_share() (+29 more)

### Community 7 - "Job Market Intelligence & Skills Analytics — DEPI R5 Final Project"
Cohesion: 0.20
Nodes (10): Cleaning rules (summary), Dashboard modules, Data, Documentation, Job Market Intelligence & Skills Analytics — DEPI R5 Final Project, Outputs, Quick start, Repository layout (+2 more)

### Community 8 - "fmtInt"
Cohesion: 0.11
Nodes (51): Chart(), ChartHandle, Handler, ADDED(), BarDatum, CohortMonths(), Handle, HBar() (+43 more)

### Community 9 - "load"
Cohesion: 0.40
Nodes (4): load(), DataFrame, Path, Quick peek at every raw file: row count, and per column the dtype, null %,…

### Community 11 - "profile.ts"
Cohesion: 0.16
Nodes (9): EMPTY, listeners, Profile, snapshot, withoutSkill(), write(), MAP, roadmapLinks() (+1 more)

### Community 12 - "build_analytics.py"
Cohesion: 0.33
Nodes (6): build(), main(), Path, Processed CSVs -> DuckDB analytical store used by the dashboard API. python…, match_key(), Aggressive normalization used ONLY for matching / deduplication. Lowercases,…

### Community 13 - "main.py"
Cohesion: 0.16
Nodes (40): get_store(), breakdown(), cached(), career_gap(), career_roadmap(), companies(), company_profile(), compare_view() (+32 more)

### Community 14 - "unhandled"
Cohesion: 0.33
Nodes (7): raw_rate_limit(), timing(), unhandled(), Exception, exception_handler, middleware, Request

### Community 15 - "Components"
Cohesion: 0.07
Nodes (28): Buttons, Cards / Containers, Chips, Colors, Components, Coverage Strip (signature), Design System: Bosla, Do: (+20 more)

### Community 16 - "ui.tsx"
Cohesion: 0.11
Nodes (21): Button(), Callout(), ChartPanel(), csvCell(), DataTable(), IconButton(), PageHeader(), Pill() (+13 more)

### Community 17 - "t"
Cohesion: 0.11
Nodes (38): CoverageItem, CoverageStrip(), growOf(), Facet(), groupBy(), OptionRow(), Description(), Facts() (+30 more)

### Community 19 - "types.ts"
Cohesion: 0.09
Nodes (27): CategoryRow, CoLink, Cooc, Count, CountryRow, GapSkill, Geo, Insight (+19 more)

### Community 20 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, type, version, cmdk, echarts, @fontsource-variable/geist, @fontsource-variable/readex-pro (+11 more)

### Community 21 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 22 - "Compare.tsx"
Cohesion: 0.07
Nodes (52): ActiveChips(), facetLabel(), facets(), FilterBar(), more(), MoreFilters(), Option, Population() (+44 more)

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
Cohesion: 0.15
Nodes (13): Career planner, Compare markets, Data & methodology, Employers, Geography, Guided insights, Insight builder, Job explorer (+5 more)

### Community 28 - "Data limitations and integrity"
Cohesion: 0.15
Nodes (13): Data limitations and integrity, Employers, Geographic imbalance, It is a sample of postings, not the labour market, Missing fields, One source dominates, Requirements at risk (project documentation), Roles and seniority (+5 more)

### Community 29 - "main.tsx"
Cohesion: 0.06
Nodes (41): RouteErrorBoundary(), barState(), Brand(), JobSearch(), LinkTo, ModeSwitch(), nav(), NavItem (+33 more)

### Community 30 - "Product"
Cohesion: 0.15
Nodes (12): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+4 more)

### Community 31 - "Data catalog"
Cohesion: 0.17
Nodes (11): 1. Sources, 2. Tables, 3. Relationships, 4. Coverage, 5. Analytical use cases supported, 6. Data that cannot be used responsibly (and how the dashboard treats it), Data catalog, `job_skills.csv` → store table `job_skills` (one row per posting × skill) (+3 more)

### Community 32 - "Metric definitions"
Cohesion: 0.17
Nodes (12): Career planner, Comparison studio, Counts, Geography, Guided insights, Insight builder, Metric definitions, Populations and filters (+4 more)

### Community 33 - "make_demo_data.py"
Cohesion: 0.18
Nodes (10): generate(), DataFrame, Path, Generate a SMALL, SYNTHETIC dataset with the same schema as the pipeline…, write(), is_technical(), Skill categories and display names. Two sources, recorded per skill in…, (category, category_source) for a canonical skill key. (+2 more)

### Community 34 - "Design system"
Cohesion: 0.18
Nodes (11): Accessibility, Charts, Colour, Components, Data colours (qamariyya stained glass), Design system, Direction, Interaction patterns (+3 more)

### Community 35 - "test_roadmap.py"
Cohesion: 0.18
Nodes (20): assign_stages(), career_roadmap(), excluded(), market_premium(), Filters, Split ranked skill rows (`skill`, `share`, `wilson_lower`) into disjoint…, Pay premium of a skill over its role, compared market by market. premium =…, Niche skills with a positive within-market pay premium, best first. Salary… (+12 more)

### Community 36 - "Filters"
Cohesion: 0.09
Nodes (31): Filters, BaseModel, Extra condition on job_skills rows for skill metrics., `WITH f AS (filtered jobs)` prefix used by most queries., Only the filters that differ from the defaults (for display/provenance)., Copy with some filters reset, e.g. to compute a chart's own breakdown., SQL condition over the `jobs` table (aliased) + its parameters., Lower bound of the 95% Wilson score interval for a proportion k/n. Used to rank… (+23 more)

### Community 37 - "tv"
Cohesion: 0.26
Nodes (23): AsyncFacet(), About(), Match(), useApi(), drillHref(), fmtDate(), useFilters(), tv() (+15 more)

### Community 38 - "Deployment"
Cohesion: 0.20
Nodes (9): Configuration, Deployment, Development mode (hot reload), Hosted option (only with the data owners' agreement), If `data/processed/` is locked, Local (recommended for the DEPI demo), Rebuilding after data changes, Vercel (real store, deployed from the CLI) (+1 more)

### Community 39 - "Testing and results"
Cohesion: 0.20
Nodes (10): Analytics integrity (KPI S1), API (real store, `python scripts/benchmark_api.py --runs 5`), End-to-end scenarios, Independent reviews, Not covered, Performance, Pipeline, Summary (+2 more)

### Community 41 - "@playwright/test"
Cohesion: 0.14
Nodes (6): ROUTES, out, runs, routes, @axe-core/playwright, @playwright/test

### Community 42 - "run"
Cohesion: 0.19
Nodes (13): builder_csv(), builder_run(), BuilderRequest, _cell(), BaseModel, Neutralize spreadsheet formulas: employer names such as '+OneX' or '@Orchard'., Reject nonsensical combinations; return (code, text) warnings for legitimate-…, run() (+5 more)

### Community 43 - "Bosla logo — usage guide"
Cohesion: 0.25
Nodes (7): Bosla logo — usage guide, Colour, Construction, Files (`final/`), In the product, Open items, Rules

### Community 44 - "Architecture"
Cohesion: 0.29
Nodes (7): Architecture, Backend layout, Decisions, Flow, Front-end layout, Performance (measured), Security and reliability

### Community 45 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, e2e, preview, test, typecheck

### Community 46 - "db.py"
Cohesion: 0.08
Nodes (16): Any, Path, Read-only access to the DuckDB analytical store + a small result cache. The…, Used by tests to point the API at a different store., Allowed values of every low-cardinality filter (validated on input)., Thread-safe LRU keyed by (endpoint, normalized parameters)., reset_store(), ResultCache (+8 more)

### Community 47 - "Feature coverage"
Cohesion: 0.33
Nodes (5): 1. Project requirements (Project Documentation, section 3), 2. Brief modules (A–L), 3. Data-to-feature coverage matrix, 4. Deliberately excluded or partial, Feature coverage

### Community 48 - "Roadmap page: design"
Cohesion: 0.15
Nodes (12): Anti-goals (a failure even if it works), API, Exclude list, Goals, Left to the builder, Non-goals, Roadmap page: design, roadmap.sh links (+4 more)

### Community 49 - "vite.config.ts"
Cohesion: 0.40
Nodes (3): @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 50 - "Geography.tsx"
Cohesion: 0.11
Nodes (27): Lattice(), InfoTip(), Panel(), Segmented(), TextLink(), fmtMonth(), fmts(), fmtUsdFull() (+19 more)

### Community 55 - "Skills.tsx"
Cohesion: 0.47
Nodes (8): useParam(), useAdvanced(), BySegment(), Demand(), dims(), SkillBreakdown(), Skills(), useHave()

### Community 56 - "Insights.tsx"
Cohesion: 0.48
Nodes (6): Guard(), drillLabel(), filterName(), Insights(), kindLabel(), sentence()

### Community 59 - "Review Focus"
Cohesion: 0.29
Nodes (6): Global Constraints, Review Focus, Roadmap Page Implementation Plan, Task 1: Pure roadmap helpers, Task 2: Roadmap query and endpoint, Task 3: Roadmap page

## Knowledge Gaps
- **293 isolated node(s):** `Global Constraints`, `Task 1: Pure roadmap helpers`, `Task 2: Roadmap query and endpoint`, `Task 3: Roadmap page`, `Why` (+288 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 474 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `tv`, `fmtInt`, `ui.tsx`, `Boundary`, `Geography.tsx`, `Compare.tsx`, `Skills.tsx`, `Insights.tsx`, `main.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `react` connect `t` to `tv`, `fmtInt`, `profile.ts`, `ui.tsx`, `Geography.tsx`, `package.json`, `Compare.tsx`, `Skills.tsx`, `main.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `clsx` connect `t` to `tv`, `fmtInt`, `ui.tsx`, `Geography.tsx`, `package.json`, `Compare.tsx`, `Skills.tsx`, `main.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `Global Constraints`, `Task 1: Pure roadmap helpers`, `Task 2: Roadmap query and endpoint` to the rest of the system?**
  _293 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Store` be split into smaller, more focused modules?**
  _Cohesion score 0.12473572938689217 - nodes in this community are weakly interconnected._
- **Should `test_clean_utils.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05387205387205387 - nodes in this community are weakly interconnected._
- **Should `Series` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._