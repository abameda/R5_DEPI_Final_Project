# Architecture

## Flow

```
data/raw/*  ──►  src/pipeline.py  ──►  data/processed/           ──►  src/build_analytics.py  ──►  data/analytics/jmi.duckdb
 (8 files)       loaders + clean_utils    jobs_clean.csv               (adds keys, cohorts,            (read-only store, ~70 MB)
                 + skill_taxonomy         job_skills.csv (is_observed)  salary kinds, flags, meta)              │
                                          skills_dim.csv                                                     ▼
                 reports/data_quality_report.md                                                     api/ (FastAPI)
                 reports/pipeline_stats.json                                                  parameterized SQL, result cache
                                                                                                       │  JSON over /api
                                                                                                       ▼
                                                                                         frontend/ (React SPA, served by
                                                                                          the API in production, by Vite in dev)
```

Every stage is a script that can be rerun from the previous stage's files:
`python src/pipeline.py` → `python src/build_analytics.py` → `uvicorn api.main:app`.

## Decisions

| Decision | Choice | Why | Alternatives considered |
|---|---|---|---|
| Dashboard stack | FastAPI + React instead of the Streamlit app planned in the project document | Server-side filtering of 588k postings / 3M skill rows, URL-shareable state, drilldowns, keyboard-accessible custom interactions (the lattice), and a product-grade UI. Streamlit reruns whole scripts per interaction and cannot hold this interaction model | Streamlit (planned), Dash, Next.js (SSR not needed: no SEO, all data is behind filters) |
| Analytical storage | One DuckDB file built from the processed CSVs | Columnar, in-process, zero ops; every measured query on the full data runs in 3–600 ms; one file is easy to rebuild and move. CSV → DuckDB load takes ~3 s | Parquet files queried by DuckDB (same engine, more files), PostgreSQL (server to run), pandas in memory (seconds per aggregate) |
| Pre-aggregation | None beyond `skill_totals`; an in-process LRU result cache (1,024 entries) instead | Live SQL is fast enough (p95 cold ≈ 0.6 s), so pre-aggregated tables would only add a second truth to keep in sync. The store is immutable while the API runs, so cached results never go stale | Materialized cubes per filter combination |
| Query construction | Whitelisted columns/dimensions in code, all values bound as parameters | No user text ever becomes SQL; invalid values are rejected with 422 against the store's own domains | ORM (adds little for analytical SQL) |
| Filters | One `Filters` model (`api/filters.py`) used by every endpoint; the URL uses the same parameter names | A view's query string *is* its API query; shareable links; one place for semantics (OR within a facet, AND across, skills = must have all) | Per-endpoint parameters |
| Skill provenance | Per (posting, skill) `is_observed` flag computed in the pipeline | The posting-level flag hid the observed part of 31k Arab-market postings; per-skill provenance lets every metric switch modes | Dropping enriched postings |
| Cohorts | `cohort` column (`kaggle_2023` / `collected_2026`) in the store | Makes "never mix in a trend" enforceable in queries and visible in the UI | Year-based logic in each query |
| Front end | React 19 + TypeScript, Vite, TanStack Query, React Router, Tailwind 4, Radix Popover + cmdk, ECharts (tree-shaken, canvas) | Typed, fast builds, cached server state with previous-data placeholders (no flicker on filter change), accessible primitives where hand-rolling is risky, ECharts for heatmaps/boxplots/maps/graphs in one library | shadcn/ui (Radix-based; would add many components we do not use), Recharts (no maps/graphs/boxplots), D3 (more code per chart) |
| Map | world-atlas (Natural Earth 1:50m, public domain) + topojson-client, loaded only on the Geography route | Offline, no tile server or key, correct country polygons | Mapbox/Leaflet tiles (network + keys) |
| Hosting | API serves the built SPA (`frontend/dist`) on one port | One process to run for a demo; same origin, no CORS | Separate static host + API |

## Backend layout

```
api/
  main.py          routes, result cache wrapper, error handler, rate limit on raw postings, SPA serving
  db.py            read-only DuckDB connection, per-thread cursors, filter domains, LRU cache
  filters.py       Filters model → parameterized WHERE / CTE
  labels.py        thresholds, labels, Wilson bound, share helper
  queries/
    market.py      KPIs, breakdowns (incl. GROUPING SETS), job list/detail, countries, crosstab, employers
    skills.py      top skills, categories, matrices, co-occurrence, skill profile, career gap
    salary.py      coverage, quantiles by dimension, histogram (advertised XOR benchmark)
    trends.py      within-cohort monthly series, 2023 half-year change, cohort snapshots
    compare.py     two-segment comparison + warnings
    quality.py     methodology page data
    builder.py     insight builder (whitelisted), CSV export, guided insights
```

All endpoints are synchronous functions run in FastAPI's thread pool; each thread uses its
own DuckDB cursor on one shared read-only connection.

Endpoint list: see `GET /docs` (OpenAPI) when the API runs.

## Front-end layout

```
frontend/src/
  main.tsx               routes (lazy-loaded pages), error boundary, font preload
  lib/filters.ts         URL ⇄ Filters, drilldown hrefs
  lib/api.ts             fetch wrapper, useApi / usePost (TanStack Query)
  lib/hooks.ts           useFilters, useParam, useUpdateParams, useMeta, useTheme
  lib/echarts.ts         tree-shaken ECharts, theme tokens, semantic hues (HUE)
  components/            Shell (rail, nav), FilterBar, Chart, charts (HBar, SkillBars,
                         Histogram, CohortMonths, MonthLines), Lattice, Kpi, ui primitives
  pages/                 one file per module
```

The browser never receives raw data in bulk: aggregates (largest response ≈ 55 KB) and
one page of postings at a time (≤ 50 rows).

## Security and reliability

* Parameterized SQL only; enumerated filters validated against the store; free-text
  lengths capped; LIKE wildcards escaped.
* Store opened read-only; no write endpoints.
* Raw postings: paginated (≤ 50 per page, first 10,000 results), rate-limited per client
  (120 requests/minute); exports are aggregate-only, CSV cells neutralized against formulas.
* SPA route serves only plain relative paths (no drive letters, UNC paths or `..`).
* Generic 500 responses (details logged server-side only).
* Untrusted text in chart tooltips is HTML-escaped; external links only for `http(s)` with
  `rel="noopener noreferrer nofollow"`.
* No secrets: the project needs none (no API keys are used by the dashboard).
* Front end: route-level error boundary; every data region has loading, error (with retry)
  and empty states.

## Performance (measured)

See [TESTING.md](TESTING.md#performance) for the full tables. Summary on the real store
(588,545 postings, 3.04M skill rows, Windows laptop, 12 logical CPUs, 16 GB RAM):
cold API median 174 ms, p95 633 ms, slowest 1.3 s (skill-defined comparison); cached
4–16 ms. Production build: first load 641 ms, filter update 250 ms, route change 62 ms (medians).
