# Design system

The visual and interaction rules of the dashboard. Source of truth for values:
`frontend/src/styles.css` (tokens) and `frontend/src/lib/echarts.ts` (chart hues).
`DESIGN.md` at the repository root records the same system in the Impeccable format.

## Direction

**Mashrabiya.** The turned-wood lattice screens of Cairene houses: light comes through a
grid of openings. The world lends the product four things only — type, palette, density and
one signature move — and never its layout or controls, which are the standard ones of a
web analytics tool.

* **Rail**: deep teak; navigation grouped Explore / Analyze / Plan / Trust.
* **Ground**: shaded plaster (cool off-white `#eceeed`, never cream); white work panels with
  hairline plaster borders. Dark mode: dark teak ground `#130e0a`, panels `#1d1712`.
* **Signature**: the lattice (role × skill and other segment × skill matrices). Each opening's
  **area** is the share; brightness repeats it; hover/focus keeps the row and column lit
  and dims the rest; click or Enter opens the postings.

Alternatives were generated from the audience's world (transit diagrams, statistical
yearbooks, survey atlases, passports, drafting sheets, departure boards, mashrabiya) and
the direction was chosen by a seeded roll, then raised with disciplines from six declined
challengers: nothing labelled twice; a changed figure stays marked; focus dims the rest;
one size does the work; the bright colour is always something you can press or have
selected; columns never move, rows re-rank.

## Colour

| Role | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#eceeed` | `#130e0a` | page ground |
| `--panel` / `--panel-2` | `#ffffff` / `#f5f6f5` | `#1d1712` / `#241d17` | work panels / table heads, tracks |
| `--line` / `--line-strong` | `#dcdfdd` / `#c4c9c6` | `#352b23` / `#4a3d33` | hairlines / control borders |
| `--ink` / `--ink-2` / `--ink-3` | `#1c1712` / `#4c453e` / `#6b635b` | `#f2eae0` / `#cdbfb0` / `#a59686` | text levels (all ≥ 4.5:1 on panel) |
| `--rail` family | `#24180f`, `#33241a` | `#0d0906`, `#1b130d` | rail, lattice frame |
| `--accent` / `--accent-ink` / `--accent-soft` | `#e2a13a` / `#8a5300` / `#fbedd3` | `#e8ae4e` / `#f0bd62` / `#3b2b12` | **selection, focus, lattice light only** |
| `--warn` / `--warn-soft` | `#a4471c` / `#fbe6dc` | `#f08a5d` / `#3a2015` | warnings (burnt orange, distinct from amber) |
| `--crit` / `--good` | `#b3262f` / `#2b7a32` | `#f07a80` / `#6cc070` | errors / success |

**Amber is never a data colour.** It marks what you can press or have selected, focus
rings use `--accent-ink` (≥ 3:1 on every ground), and the lattice's light.

### Data colours (qamariyya stained glass)

Entity hues, the same in every module (`HUE` in `lib/echarts.ts`):

| Entity | Hue | Light | Dark |
|---|---|---|---|
| Posting attributes (role, seniority, employment) | cobalt | `#2f5bb7` | `#5a82d8` |
| Skills | turquoise | `#00968c` | `#139a8f` |
| Places (country, market, work mode) | emerald | `#4f8f1f` | `#5f9a2c` |
| Pay | ruby | `#b8344a` | `#e0657d` |
| Data sources and collections | violet (2023 solid, 2024–26 soft) | `#7b52b0` / `#cbbbe3` | `#9b7ad2` / `#4a3a6a` |

Categorical order for multi-series charts (`categorical()`): cobalt, turquoise, ruby,
violet, emerald. Validated with the dataviz palette validator in both themes: every
adjacent pair passes CVD and normal-vision separation; the first three also pass all-pairs
(use them for scatter-like or map-like charts). Sequential magnitude (map, lattice) is a
single amber-to-brown ramp (`--lattice-0` → `--lattice-1`) paired with size or a table.

### Never colour alone

* Team-added skills: **hatched** bar segments, **dashed** chips and pills.
* Small samples: **dashed** lattice frames and boxplots, **hatched** map countries and
  builder bars, "small" pills.
* Changed KPIs: a static dot plus screen-reader text, not only a flash.
* Every chart has a table view; legends exist for ≥ 2 series and selected values are
  labelled directly.

## Type

One family with Latin and Arabic: **Readex Pro** (variable, self-hosted via Fontsource,
loaded before the first chart so axis labels are measured with it). Tabular figures on
tables and KPIs.

| Token | Size / line | Use |
|---|---|---|
| `text-xs` | 12/16 | meta lines, axis labels, captions |
| `text-sm` | 13/20 | controls, tables, chips |
| `text-base` | 14/22 | body (the size that does the work) |
| `text-lg` | 16/24 | section values, insight sentences |
| `text-xl` | 20/28 | page titles |
| `text-2xl` | 24/32 | KPI figures |

Ratio ≈ 1.125–1.2 (fixed rem scale, no fluid type). Headings are semibold, labels medium.

## Space, shape, depth

4 px base (Tailwind spacing). Panels: 8 px radius, 1 px border, 16 px padding, 16 px gaps
between panels; page gutters 16 px (phone) / 24 px (desktop). Shadows only on floating
layers (popovers, tooltips): offset + soft blur. No glass, gradients or side stripes.

## Components

| Component | Rules |
|---|---|
| Panel / ChartPanel | Title, one meta line stating the population/denominator, optional "how is this calculated" popover, actions: table view, PNG, CSV |
| KPI strip | A definition list; value + one denominator line that wraps; change dot after filter edits |
| Filter bar | Search, facet popovers (searchable, counts, grouped countries), "More", provenance radio group, chips with remove, reset, population line. Sticky on desktop; facets fold behind "Filters" on phones |
| Segmented | Radio group with one tab stop and arrow/Home/End keys |
| Lattice | ARIA grid of buttons, roving tab stop, arrows/Home/End/PageUp/PageDown, live readout, sticky row labels, cells stretch on phones |
| Tables | Sticky header, sortable headers with `aria-sort`, columns never move, numbers right-aligned in tabular figures |
| States | Skeleton shimmer (static under reduced motion); previous data dimmed while refetching; error with retry; empty state with a recovery action; route error boundary |
| Pills | neutral, accent (selection only), warn (status), good, added (dashed) |
| Links | `--accent-ink`, underline offset 2–3 px; external only `http(s)` with `rel="noopener noreferrer nofollow"` |

## Charts

ECharts, canvas renderer, tree-shaken. Horizontal ranked bars for categories (largest on
top, value + share labels), stacked written/added bars for skills, boxplots with P10–P90
whiskers and n labels for pay, heatmaps for pair associations and role mixes, a dumbbell for
two-segment gaps, small multiples for the two collections, a choropleth for countries, a
force network only for strong pairs. No pie charts, no dual axes. Recessive dashed grid,
ink-coloured text, tooltips on panel colour with escaped content. Animations 250 ms, off
under reduced motion.

## Interaction patterns

Every bar, cell, country and row drills into the matching postings (the drilled facet is
narrowed to the clicked value; skills are added). All state lives in the URL. Motion
conveys state only (150–250 ms, exponential ease-out); the one authored moment is the
lattice's light.

## Accessibility

WCAG 2.1 AA target, verified with axe-core on four pages (0 serious/critical) plus
keyboard-only e2e tests. Skip link; landmarks; visible focus (`--accent-ink`, 2 px, offset);
`prefers-reduced-motion` honoured in CSS and charts; Arabic text isolated with
`dir="auto"` / `<bdi>`; charts carry written labels and a table alternative.
