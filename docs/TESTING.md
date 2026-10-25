# Testing and results

All results below were produced on 2026-10-25 on the development laptop (Windows 11,
12 logical CPUs, 16 GB RAM, Python 3.14, Node 24) against commit-level code on branch
`feature/dashboard`.

## Summary

| Suite | Command | What it covers | Result |
|---|---|---|---|
| Cleaning rules | `python -m pytest tests/test_clean_utils.py` | text normalization, PII removal, language, countries, market rule, job type, seniority, roles, titles, skill parsing/synonyms, salaries, taxonomy, merged-file provenance | **39 passed** |
| API + analytics (synthetic store) | `python -m pytest tests/test_api.py` | every endpoint; each metric recomputed independently with pandas from the CSVs; filters, provenance, skill AND filter, dates, salary kinds, pagination, compare normalization and warnings, career gap, trends cohort separation, builder validation and denominators, CSV export, error codes, rate limit, SPA path guard | **42 passed** |
| KPI S1 integrity (real store) | `python -m pytest tests/test_integrity_real.py` | 11 dashboard figures vs independent pandas calculations on the real processed CSVs (skipped when the real store is absent) | **11 passed** |
| Front-end unit | `cd frontend && npm test` | URL filter state round-trip, drilldown semantics, JSON bodies, formatters | **9 passed** |
| End-to-end (Playwright, synthetic store) | `cd frontend && npx playwright test` | 39 scenarios — see below | **39 passed** (two consecutive full runs) |
| Accessibility (axe-core in Playwright) | part of the e2e suite | WCAG 2.0 A/AA + 2.1 AA rules on Overview, Explorer with detail open, Career, Methodology | **0 serious/critical violations** |
| Type check / build | `npm run typecheck`, `npm run build` | strict TypeScript, production bundle | clean |

`python -m pytest -q` runs the three Python suites together: **92 passed**.

## Analytics integrity (KPI S1)

`tests/test_integrity_real.py` reads `data/processed*/*.csv` with pandas — never the DuckDB
store — and compares with the API:

1. total unique postings · 2. distinct countries · 3. market-type counts · 4. top-10
countries · 5. top-10 skill shares · 6. top-5 observed-only skill shares · 7. Egypt role
mix · 8. median advertised salary by role (n ≥ 10) · 9. top employer posting counts ·
10. Python share within Data Analysis & BI · 11. no posting attributed to Sudan.
All 11 match (shares to 1e-5). The project KPI asks for 10 of 10.

## End-to-end scenarios

Routing: all 12 modules render with no console errors or failed API calls; unknown routes.
Filters: facet selection updates URL, chips and population; reset; filters survive
navigation; keyword search debounced into the URL; spaces typed after a pause are kept;
provenance switch. Drilldowns: lattice keyboard navigation + Enter opens matching postings;
the lattice survives a filter change while a cell is focused (regression for a crash found
in review). Explorer: pagination, sort (resets page), detail open/close, out-of-range pages
snap back, empty state recovery. Exports: table view and CSV download. Theme persistence.
Skill profile open/close. Career planner skill picker and ranking. Compare presets; global
filters preserved; all-vs-all. Builder disables invalid measures. Methodology hides the
filter bar. Skip link. Mobile (Pixel 7): menu navigation, facets behind "Filters", no
horizontal scroll on five pages. Accessibility scans on four pages.

## Independent reviews

Three fresh-context reviewers were run on the finished build (no access to this
conversation): an analytics/statistics/security reviewer, a front-end code/UX/a11y reviewer
(verifying in the running app), and a design finish reviewer (against the direction
contract and craft floor).

| Review | Confirmed findings | Outcome |
|---|---|---|
| Analytics & security | 13 | 12 fixed with regression tests (e.g. builder share denominators with a split, skill-category double counting, small salary groups, pairing insight built from team-added blocks, UNC path in the SPA route, raw-posting rate limit, CSV formula cells). 1 rejected with evidence: the reviewer proposed treating 7,450 "Inferred" merged rows as observed; every title × country group of those rows carries one identical list (63/63 groups) while "Original" groups vary (median 59 lists per group), so they are templates, not source data |
| Front end | 17 confirmed + unconfirmed notes | All 17 fixed (incl. a crash after filter changes, drilldowns appending to OR facets, page counters not resetting, search swallowing spaces, ECharts overriding accessible names, focus-ring contrast, Segmented arrow keys, mobile detail visibility) plus the cheap unconfirmed items |
| Design finish | 8 material fixes → 2 verdict passes | Pass 1: 4 resolved, 3 partial, 1 not visible, 3 regressions; pass 2: all resolved, disposition **ship** (scoped to the scored fixes) |

## Performance

Targets (project NFR-01): initial load < 5 s, filter update < 3 s on a standard laptop.
Engineering target set here: cold API p95 < 1 s.

### API (real store, `python scripts/benchmark_api.py --runs 5`)

"Cold" = result cache cleared before every call (DuckDB buffers warm, as in a running
server). 26 realistic requests, 5 runs each.

| Request | cold median (ms) | cold max (ms) | cached (ms) | response (KB) |
|---|---:|---:|---:|---:|
| `GET /api/meta` | 35 | 107 | 5.4 | 11.4 |
| `GET /api/overview` | 301 | 349 | 4.7 | 12.1 |
| `GET /api/overview?market=Arab` | 108 | 173 | 10.6 | 9.9 |
| `GET /api/overview?country=Egypt&role=Data Analysis & BI` | 115 | 133 | 9.6 | 7.3 |
| `GET /api/overview?provenance=observed&cohort=collected_2026` | 194 | 202 | 10.0 | 11.1 |
| `GET /api/breakdown?dim=cohort&q=engineer` | 56 | 60 | 4.1 | 0.1 |
| `GET /api/jobs?page=1&sort=newest` | 26 | 49 | 6.7 | 46.6 |
| `GET /api/jobs?q=data engineer&sort=salary_high&page=3` | 87 | 93 | 13.2 | 30.1 |
| `GET /api/jobs?skill=Python&skill=SQL&country=United States` | 199 | 209 | 16.9 | 47.0 |
| `GET /api/skills/top?limit=30` | 77 | 98 | 10.2 | 4.9 |
| `GET /api/skills/matrix?dim=role_category&groups=10&top=16` | 168 | 169 | 7.6 | 11.7 |
| `GET /api/skills/matrix?dim=country&groups=15&top=18&market=International` | 145 | 158 | 9.8 | 17.4 |
| `GET /api/skills/cooccurrence?limit=18` | 191 | 208 | 11.9 | 20.2 |
| `GET /api/skills/detail?name=Python` | 490 | 522 | 14.2 | 14.5 |
| `GET /api/career/gap?target_role=Data Analysis & BI&have=SQL&have=Excel&market=Arab` | 180 | 199 | 9.8 | 13.4 |
| `GET /api/salary/summary?dim=country` | 42 | 57 | 10.1 | 4.0 |
| `GET /api/salary/summary?dim=skill&period=year` | 62 | 67 | 5.7 | 4.1 |
| `GET /api/geo/countries` | 195 | 201 | 16.2 | 55.2 |
| `GET /api/trends` | 401 | 412 | 17.7 | 43.5 |
| `GET /api/companies?sort=postings` | 135 | 152 | 8.4 | 4.8 |
| `GET /api/companies/profile?name=Deloitte` | 209 | 226 | 9.5 | 5.6 |
| `GET /api/insights` | 586 | 630 | 7.4 | 2.6 |
| `GET /api/quality` | 212 | 296 | 7.8 | 7.9 |
| `POST /api/compare` Egypt vs United States | 234 | 268 | 6.1 | 13.0 |
| `POST /api/compare` Python vs SQL postings | 1028 | 1086 | 13.0 | 12.9 |
| `POST /api/builder` skill × market, share | 571 | 633 | 5.9 | 6.2 |

**All cold requests: median 170 ms, p95 589 ms, max 1,086 ms.** Largest response 55 KB.

Bottleneck found and fixed: comparing two skill-defined segments ran ~15 queries per
segment, each re-evaluating the skill sub-query (2.1 s). Breakdowns now share one
`GROUPING SETS` scan (1.0 s). Remaining slowest: skill-vs-skill compare (1.0 s) — within targets.

### User-facing timings (production build served by FastAPI, real data)

`node frontend/scripts/benchmark-ui.mjs http://127.0.0.1:8020 5` — new browser context per
run (empty HTTP cache), first query unique so the API cache cannot answer it.

| Interaction | Median | Range |
|---|---:|---:|
| First load → KPIs and lattice rendered | **646 ms** | 584–1,439 ms |
| Filter change → population and KPIs updated | **175 ms** | 160–270 ms |
| Route change → Skills page charts rendered (filter carried over) | **433 ms** | 61 ms cached – 990 ms cold |

Transferred on first load: ~0.8–1.0 MB uncompressed (fonts for Latin and Arabic, ECharts
chunk, app); main app chunk 245 KB (77 KB gzip); ECharts 248 KB gzip and the world atlas
244 KB gzip load only on pages that use them.

## Pipeline

`python src/pipeline.py`: 138 s end to end for 775,155 raw rows (target < 30 min, NFR-02).
`python src/build_analytics.py`: ~3 s.

## Not covered

* Pilot-user study (U1/U2): needs real participants.
* Second operating system (NFR-25): commands are documented for Linux/macOS but were
  only executed on Windows.
* Screen-reader walkthrough with NVDA/VoiceOver: structure is tested with axe and
  keyboard-only e2e tests, not with an actual screen reader.
* Load testing with many concurrent users (the intended use is a single laptop demo).
