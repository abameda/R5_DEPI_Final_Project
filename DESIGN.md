---
name: Job Market Intelligence
description: A working analytics product where demand is light coming through a mashrabiya lattice.
colors:
  plaster-ground: "#eceeed"
  panel: "#ffffff"
  panel-recess: "#f5f6f5"
  plaster-hairline: "#dcdfdd"
  plaster-hairline-strong: "#c4c9c6"
  ink: "#1c1712"
  ink-2: "#4c453e"
  ink-3: "#6b635b"
  teak-rail: "#24180f"
  teak-rail-raised: "#33241a"
  teak-rail-line: "#46342a"
  rail-ink: "#f3eadf"
  rail-ink-2: "#c4b3a0"
  sunlit-amber: "#e2a13a"
  amber-ink: "#8a5300"
  amber-wash: "#fbedd3"
  amber-line: "#e9c27f"
  glass-cobalt: "#2f5bb7"
  glass-turquoise: "#00968c"
  glass-violet: "#7b52b0"
  glass-ruby: "#b8344a"
  glass-emerald: "#4f8f1f"
  cobalt-pale: "#b9c9ec"
  turquoise-pale: "#b3e0dc"
  violet-pale: "#cbbbe3"
  status-good: "#2b7a32"
  status-warn: "#a4471c"
  status-warn-wash: "#fbe6dc"
  status-crit: "#b3262f"
  status-crit-wash: "#fbe7e8"
  info-wash: "#e7eefb"
typography:
  headline:
    fontFamily: "Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  title-page:
    fontFamily: "Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.025em"
  title-panel:
    fontFamily: "Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.375rem"
  body:
    fontFamily: "Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.375rem"
  body-sm:
    fontFamily: "Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
  chart-axis:
    fontFamily: "Readex Pro Variable, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.teak-rail}"
    textColor: "{colors.rail-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.teak-rail-raised}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.panel-recess}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  icon-button:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.md}"
    size: "28px"
  icon-button-active:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber-ink}"
  segmented-option-selected:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.sm}"
    height: "28px"
  select:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "32px"
  filter-chip:
    backgroundColor: "{colors.panel-recess}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "2px 4px 2px 8px"
  facet-trigger-active:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.md}"
    height: "32px"
  pill-neutral:
    backgroundColor: "{colors.panel-recess}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "14px 16px 16px"
  kpi-figure:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
  nav-item:
    textColor: "{colors.rail-ink-2}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    height: "36px"
  nav-item-active:
    backgroundColor: "{colors.teak-rail-raised}"
    textColor: "{colors.rail-ink}"
  lattice-aperture:
    backgroundColor: "{colors.teak-rail-raised}"
    height: "32px"
---

# Design System: Job Market Intelligence

## Overview

**Creative North Star: "Light Through the Mashrabiya"**

A dense, working analytics product set inside a Cairene mashrabiya. A deep teak rail holds the navigation; the work happens on a cool shaded-plaster ground with white panels drawn in plaster hairlines. Sunlit amber is the light that comes through the screen: it marks what is selected, what has focus, what changed, and the openings of the role × skill lattice. Data itself is coloured from qamariyya stained glass, one glass hue per kind of entity, held constant in every module so a colour always means the same kind of thing.

The lattice is the one place the world speaks out loud. Everywhere else the system is quiet and exact: one sans for Arabic and Latin, tabular figures, a tight scale where a single size does most of the work, nothing labelled twice, every figure carrying its denominator. Night mode is a dark teak ground with the same glass, each value selected for its theme rather than flipped.

The system rejects the analytics default of a grey card grid with one blue accent and a hero-metric row.

**Key Characteristics:**
- Teak rail and header, shaded-plaster ground (cool off-white, never cream), white panels with hairline borders.
- Amber means "selected, focused, changed, or lit"; it never encodes a data series.
- One stained-glass hue per entity kind, identical across modules and both themes.
- Uncertainty and team-added data are carried by dashes and hatching, never by colour alone.
- Tight type scale, tabular numerals, compact 32px controls.
- Flat surfaces; shadow only on floating layers.

## Colors

A warm teak-and-plaster frame around a cool working ground, with amber light reserved for interaction and a five-hue stained-glass set for data.

### Primary
- **Sunlit Amber** (sunlit-amber): the lattice's light (aperture fill, mixed into teak by share), the active nav icon, the checked facet box, the KPI "changed" dot, chart hover emphasis. Never a data series.
- **Amber Ink** (amber-ink): text and outline form of the amber: focus ring, links, selected segment text, caret, checkbox accent. Light amber fails contrast as text; this is the readable one.
- **Amber Wash** (amber-wash): background of the selected state (segmented option, active icon button, selected table row, active facet, text selection, the "changed" flash).
- **Amber Line** (amber-line): border of active facets and link underlines.

### Secondary: the stained glass (data)
Entity hues, fixed per kind of thing in every module:
- **Glass Cobalt** (glass-cobalt): posting attributes (role, seniority, employment type). First categorical series.
- **Glass Turquoise** (glass-turquoise): skills. Second categorical series.
- **Glass Ruby** (glass-ruby): pay; also decreases and below-threshold values (negative change, lift < 0.8). Third categorical series.
- **Glass Violet** (glass-violet): data sources and collections. Fourth categorical series.
- **Glass Emerald** (glass-emerald): places (country, market, work mode). Fifth categorical series.
- **Cobalt / Turquoise / Violet Pale** (cobalt-pale, turquoise-pale, violet-pale): the lighter fill of the same entity used for its secondary form (team-added skills behind hatching, the second collection's bars).

### Tertiary: status
- **Burnt Orange** (status-warn, wash status-warn-wash): warnings and small-group markers. Deliberately distinct from amber so a warning never reads as a selection.
- **Status Red** (status-crit, wash status-crit-wash): errors and the synthetic-data banner.
- **Status Green** (status-good): positive confirmations ("you have this skill").
- **Info Wash** (info-wash): background of informational callouts, with a cobalt icon.

### Neutral
- **Shaded Plaster** (plaster-ground): page ground. Cool, never cream.
- **Panel White** (panel) and **Panel Recess** (panel-recess): work surfaces, and the recessed fill for table heads, chips, hovers and neutral pills.
- **Plaster Hairline** (plaster-hairline) and **Strong Hairline** (plaster-hairline-strong): panel borders and row rules; control borders, axis lines, popover borders, muted bars.
- **Ink 1 / 2 / 3** (ink, ink-2, ink-3): headings and figures; body and chart labels; meta, axes and captions.
- **Teak Rail** (teak-rail), **Raised Teak** (teak-rail-raised), **Rail Line** (teak-rail-line), **Rail Ink 1 / 2** (rail-ink, rail-ink-2): the sidebar, mobile top bar, primary button, and the lattice's wooden frame.

Dark-mode counterparts for every token are recorded in `.impeccable/design.json` (`colorMeta.*.dark`); each was chosen for its theme.

### Named Rules
**The Light Is Not Data Rule.** Amber is reserved for selection, focus, change marks and the lattice's light. No chart series, bar or category is ever amber. The categorical order is cobalt, turquoise, ruby, violet, emerald, with amber excluded.

**The One Glass Per Kind Rule.** A kind of entity has one hue everywhere: posting cobalt, skill turquoise, source violet, pay ruby, place emerald. A new chart picks its colour from what it counts, not from what looks good next to its neighbour. This order and these assignments were validated for colour-vision deficiency in both themes; do not reorder or substitute them.

**The Burnt Orange Is Not Amber Rule.** Warning is burnt orange (status-warn), never amber, so a warning and a selection are never confused.

## Typography

**Display Font:** none (the system has no display face)
**Body Font:** Readex Pro Variable (with Segoe UI, system-ui, sans-serif)

**Character:** One sans that carries Arabic and Latin with the same voice; tabular figures on every table, KPI and `.tnum` count. Hierarchy comes from weight and ink level more than size.

### Hierarchy
- **Headline** (600, 1.5rem / 2rem, -0.025em, tabular): KPI figures only.
- **Page title** (600, 1.25rem / 1.75rem, -0.025em): one per page, in the page header above a one-line description in ink-2.
- **Panel title** (600, 0.875rem / 1.375rem): every panel heading, followed by a meta line in label size, ink-3, stating the population and denominator.
- **Body** (400, 0.875rem / 1.375rem): the default size. Descriptions cap at roughly 48rem.
- **Body small** (400 or 500, 0.8125rem / 1.25rem): controls, buttons, chips, nav items, tables, callouts.
- **Label** (400 or 500, 0.75rem / 1rem): KPI labels, meta lines, nav group names, captions, pills. Sentence case, no tracking.
- **Chart text** (11-12px): axis labels 11px ink-3, category labels and value labels 11-12px ink-2.

### Named Rules
**The One Size Does The Work Rule.** Body at 14px carries most of the interface; the scale steps (12 / 13 / 14 / 16 / 20 / 24) are small. Emphasis is weight 500-600 or a darker ink, not a bigger size.

**The Tabular Figures Rule.** Every number that can be compared vertically uses tabular numerals.

## Layout

A two-column app shell: a 236px sticky teak rail and a fluid work column. Under 1024px the rail collapses to a 48px teak top bar with a menu button that opens the navigation full-height. The filter bar sits on a white band under a hairline, sticky at the top of the work column on desktop; the population line beneath it states what the visitor is looking at. Content is capped at 1480px, padded 16px (24px from 1024px), with 20-24px vertical padding.

Pages stack: page header, KPI strip, then panels in one-, two- or three-column grids with 16px gaps; the lattice always takes full width. Spacing follows a 4px base (4 / 8 / 12 / 16 / 24), with 16px as the dominant gap and panel inset. The KPI strip is one bordered panel divided by hairlines: six across from 1280px, three on tablets, two on phones. Chart rows run 26px per bar. The lattice scrolls sideways on narrow screens with a sticky row-header column (104px, 200px from 640px) and a written hint.

Arabic text uses `dir="auto"` on every user-data string so rows render right-to-left in place.

## Elevation & Depth

Flat by default. Panels, the KPI strip, the rail and the filter band separate by tone and hairline, not by shadow. One soft two-layer shadow exists and belongs only to floating layers: popovers, facet menus, info tips and chart tooltips. The lattice is the only place with dimensional depth, and it gets it from material (a 3px teak frame around a raised-teak well) rather than shadow.

### Shadow Vocabulary
- **Floating layer** (light `0 1px 2px rgba(36,24,15,0.06), 0 4px 14px rgba(36,24,15,0.06)`; dark `0 1px 2px rgba(0,0,0,0.3), 0 6px 18px rgba(0,0,0,0.25)`): popovers, menus, tooltips.

### Named Rules
**The Only Floating Things Cast Shadows Rule.** If it sits in the page flow, it has a hairline and no shadow.

## Shapes

Gently rounded and rectilinear. Panels and popovers use 8px corners; controls, chips and callouts 6px; small inner pieces (segmented options, table frames, checkboxes, skeletons, the focus ring) 4px. Pills and progress tracks are fully round. Bars have rounded ends only at the value end (4px on horizontal bars, 3px on columns). The lattice is the exception: square teak cells, round apertures, where the opening's area (not its radius) is proportional to the share. The brand mark repeats that motif: four amber circles of different size in a teak square.

Dashed lines and diagonal hatching are a semantic shape, not decoration: they mean "uncertain" or "added by the team".

### Named Rules
**The Dashed Means Doubt Rule.** A dashed frame, dashed outline or diagonal hatch marks small samples (fewer than 30 postings in the group), team-added skills, and benchmark rather than advertised pay. Team-added skills are always hatched or dashed, never distinguished by colour alone.

## Components

### Buttons
- **Shape:** gently curved (6px), 32px tall, 12px horizontal padding, 13px medium text, optional 14px icon with 6px gap.
- **Primary:** teak rail fill with rail ink; hover raises to the lighter teak. In dark mode the primary turns sunlit amber on teak text, because teak on a teak ground disappears.
- **Secondary:** white panel with a strong hairline border; hover fills with the recess tone.
- **Ghost:** no border, ink-2 text, recess fill on hover.
- **Icon button:** 28px square, ink-3 icon at 15px, recess on hover; pressed state is amber wash with amber ink. Every icon button has a written label (aria-label and title).
- **Focus:** a 2px amber-ink outline offset 2px on every interactive element.
- **Disabled:** 50% opacity, not-allowed cursor.

### Chips
- **Applied-filter chip:** recess fill, hairline ring, 6px corners, a grey facet name then the value, and a 20px remove button.
- **Facet trigger:** 32px outlined button; when it holds selections it becomes amber wash with amber line and amber ink, plus a count.
- **Pill:** fully round, 12px medium. Neutral (recess plus hairline ring), accent (amber wash), warn (burnt-orange wash), good (green text on recess), and added (dashed ink-3 border, no fill).

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** panel white on the plaster ground.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** one plaster hairline.
- **Internal Padding:** 16px sides, 14px top, 16px bottom. The header holds the title, an optional info tip (popover explaining the calculation), a meta line with population and n, and right-aligned icon actions.
- **Chart panel:** every chart panel offers a table view (with CSV download of the aggregate) and a PNG download.
- **Callouts:** 6px corners, 12px padding, icon plus text. Info uses the info wash with a cobalt icon; warn the burnt-orange wash; error the red wash with a 40% red border.

### Inputs / Fields
- **Style:** 32px tall, 6px corners, strong hairline border on panel white; search fields inside menus use a borderless recess fill.
- **Focus:** the global amber-ink focus ring; text caret is amber ink.
- **Checkbox:** 16px, 4px corners; checked is amber fill with an amber-ink border and teak check mark.
- **Error:** red ink message beneath; the view-level error state is a red-wash callout with a "Try again" secondary button.

### Navigation
- **Rail:** teak, 236px, brand at top, items grouped under Explore / Analyze / Plan / Trust in 12px rail-ink-2 group names (sentence case).
- **Item:** 36px tall, 6px corners, 16px line icon at stroke 1.75, 13px text in rail-ink-2; hover gives a 60% raised-teak fill and rail ink.
- **Active:** raised-teak fill, rail-line ring, medium weight, and the icon turns sunlit amber: the only amber in the rail.
- **Footer:** theme toggle and provenance note above a rail-line rule.
- **Mobile:** 48px teak top bar with brand and a 36px menu button; the rail opens full-height below it.

### KPI Strip
Six figures in one hairline-divided panel. Each has a 12px ink-3 label, a 24px semibold tabular figure, and a 12px sub-line stating the denominator. When a filter edit changes a figure, it flashes amber wash (1.6s, ease-out-expo) and keeps a 6px amber dot beside its label until the next change.

### Lattice (signature)
The role × skill matrix. A grid of square cells: a 3px teak frame and 1px teak outline around a raised-teak well, each holding a round aperture. The aperture's area is the share of the row's postings that list the skill (minimum 8%, maximum 86% of the cell width), and its brightness repeats the same value by mixing amber into teak from 18% to 100%. Apertures above half the maximum get a faint amber halo. Rows with fewer than 30 postings with skill data get a dashed frame and a burnt-orange count.

Hovering or focusing a cell lights it (aperture scales to 1.08) and keeps its row and column at full strength while every other cell dims to 35%: a reading crosshair. A live readout line above the grid states the cell in words with its denominator. Arrow keys, Home/End, Ctrl+Home/End and PageUp/PageDown move a single roving tab stop; Enter or click opens the postings for that role and skill. A legend under the grid shows three reference apertures and explains the dashed frame.

### Charts
Recessive chrome: no ticks, strong-hairline axis line, dashed (3/3) hairline grid, 11px ink-3 axis text. Ranked bars run horizontally, largest on top, with share and count as direct labels at the end, at most 16px thick. Hover emphasis turns the hovered bar amber and blurs the rest to 45%. Tooltips sit on panel white with a strong hairline, 6px corners and the floating shadow, and end with an amber-ink "Click to drill down" when clicking opens the postings behind the bar. Animations last 250ms and are off under reduced motion. Separate collections are drawn as small multiples, each with its own scale, never as one continuous line.

### Loading and Empty
Skeletons shimmer from recess to hairline over 1.4s (4px corners); refetching dims the existing view to 60%. Empty states are centred: a 22px ink-3 search icon, a medium title, one ink-2 sentence saying how to recover.

## Do's and Don'ts

### Do:
- **Do** colour every data mark by the kind of entity it counts: posting cobalt, skill turquoise, source violet, pay ruby, place emerald.
- **Do** use the categorical order cobalt, turquoise, ruby, violet, emerald for multi-series charts, in that order, in both themes.
- **Do** keep amber for selection, focus, change marks and the lattice's light; use amber ink wherever amber must be read as text or outline.
- **Do** hatch or dash team-added skills, small samples (under 30) and benchmark pay, and say so in the legend or caption.
- **Do** give every panel a meta line with its population and denominator, and every chart a table view.
- **Do** use burnt orange (status-warn) for warnings and small-group markers.
- **Do** put shadows only on popovers, menus and tooltips; separate in-flow surfaces with a plaster hairline.
- **Do** select each dark-mode value for the dark teak ground rather than inverting the light one.

### Don't:
- **Don't** use amber (or the unused amber glass hue) as a chart series, category colour or choropleth ramp.
- **Don't** distinguish team-added from written-in-posting skills by colour alone.
- **Don't** use amber for warnings, or burnt orange for selection.
- **Don't** reorder or substitute the five glass hues; the set was validated for colour-vision deficiency in both themes.
- **Don't** make the page ground cream or warm; the plaster is cool, and the warmth belongs to the teak.
- **Don't** add a hero-metric row, a grey card grid with one blue accent, or a second display face.
- **Don't** add kickers or eyebrow labels above titles; a title and its meta line are enough.
- **Don't** join the 2023 archive and the 2024-26 collection into one continuous series.
