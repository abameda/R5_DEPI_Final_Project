---
name: Bosla
description: Your tech career compass. The job market explained to one person, on light stone with one deep blue.
colors:
  bg: "#f6f6f3"
  panel: "#ffffff"
  panel-2: "#f1f1ed"
  line: "#e4e4de"
  line-strong: "#cfcfc6"
  ink: "#0e1525"
  ink-2: "#434b5d"
  ink-3: "#5f6678"
  rail: "#0f1b33"
  rail-2: "#1a2a4d"
  rail-line: "#2b3d66"
  rail-ink: "#f3f5fa"
  rail-ink-2: "#aeb8d0"
  accent: "#1e45c8"
  accent-ink: "#1a3cae"
  accent-soft: "#e9eefc"
  accent-line: "#b9c7f3"
  s1-soft: "#c7d3f7"
  s2: "#c4404f"
  s3: "#0f8285"
  s4: "#6c4bc0"
  s5: "#a06b12"
  s6: "#5b6b8c"
  good: "#0b7461"
  good-fill: "#139079"
  good-soft: "#e1f2ed"
  warn: "#995300"
  warn-fill: "#d9891a"
  warn-soft: "#fcf0dc"
  crit: "#b42318"
  crit-soft: "#fdecea"
  info-soft: "#eef2fd"
typography:
  display:
    fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: "3.125rem"
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.02em"
  answer:
    fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.015em"
  figure:
    fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: "1.5rem"
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.375rem"
  body-sm:
    fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "Geist Variable, Readex Pro Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  answer: "16px"
  full: "9999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  panel: "20px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.panel}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.panel-2}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-on-navy:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  input-search:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 12px 0 36px"
    height: "36px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "36px"
  nav-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  facet-chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  facet-chip-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  skill-have-chip:
    backgroundColor: "{colors.good-soft}"
    textColor: "{colors.good}"
    rounded: "{rounded.lg}"
    height: "32px"
  pill-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.xl}"
    padding: "{spacing.panel}"
  answer-band:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.answer}"
    padding: "28px"
  coverage-segment-have:
    backgroundColor: "{colors.good-fill}"
    rounded: "5px"
    height: "36px"
  coverage-segment-gap:
    backgroundColor: "{colors.warn-soft}"
    rounded: "5px"
    height: "36px"
  coverage-mini:
    rounded: "3px"
    height: "8px"
---

# Design System: Bosla

## Overview

**Creative North Star: "The Market, Read to You"**

A career intelligence product that reads the job market to one person. The ground is light stone, the work happens on white panels drawn with fine hairlines, and the ink is a deep navy-charcoal. One deep blue carries everything the visitor can act on and every single-series figure; two semantic hues carry the only judgement the product makes about the visitor: teal for "you have it", amber for "a gap, or treat with caution". Everything else stays neutral so those two read instantly.

Each screen has one answer, and it sits on the one navy surface the page is allowed: a written sentence ("You have 3 of the 15 skills Data Analysis & BI postings ask for most…", "Half advertise more than $X a year"), with its sample size beside it. The rest of the page is the evidence: panels, charts with table views, lists of postings. Density is that of a working tool (14px body, 36px controls), not a marketing page; Home leads with the product itself.

The world holds in both themes and both directions. Dark mode uses its own tuned values (not inverted ones) and Arabic flips the whole layout through logical properties, with Readex Pro covering the Arabic script beside Geist. The visitor's role and skills live only in this browser and every page reads them; nothing in the design implies an account.

**Key Characteristics:**
- Light stone ground (`bg`), white panels (`panel`), 1px hairlines (`line`); depth by tone and line, not shadow.
- One blue (`accent`) for action, selection, focus and all single-series data.
- Teal (`good-fill`) means only "you have it"; amber (`warn-fill`) means only "gap" or "caution / small sample".
- At most one navy answer band (`rail`) per screen, carrying a sentence.
- The coverage strip is the signature: requested skills as one bar, width = demand.
- Geist for Latin, Readex Pro for Arabic, tabular figures for every number.
- Radii 8px controls, 12px panels; shadow only on floating layers.

## Colors

A quiet neutral field with one blue voice and two semantic hues that speak only about the visitor.

### Primary
- **Deep Action Blue** (`accent`): primary buttons, the active nav item's icon and text, focus outlines, caret, link text (`accent-ink`), selected facet chips (`accent-soft` fill + `accent-line` border), the changed-figure dot, and the colour of every single-series chart and the role × skill dot matrix. `accent-ink` is the hover and text shade; `accent-soft` the wash for selection and `::selection`.
- **Blue Soft** (`s1-soft`): the hatched "added by the team" stack segment in skill bars, beside full-blue "written in the posting".

### Secondary (semantic: you)
- **Have Teal** (`good-fill` fill, `good` text, `good-soft` wash): coverage-strip segments you have, skill chips in your profile, bars of skills you have in any ranking, "you have it" readouts.
- **Gap Amber** (`warn-fill` outline/fill, `warn` text, `warn-soft` wash): coverage-strip gaps (wash with amber inset outline), "Small sample" / "Insufficient" / "Benchmark" pills, small-group counts and dashed outlines in the matrix, warn callouts.

### Tertiary (categorical, multi-series only)
- **Series set** (`accent`, then `s2` rose, `s3` cyan, `s4` violet, `s5` ochre): only for charts with two or more series and a legend (trends over time, builder output, Compare's A/B where A = blue dot, B = rose diamond).
- **Provenance Slate** (`s6`): sources and collections, so provenance never reads as a finding.
- **Market split** (Home "Where the postings are", Locations): International `accent`, Remote `s4` violet, Arab `s6` slate, always with a written legend. Never `s3` cyan or `s5` ochre here: next to the strip they read as "have" and "gap".

### Neutral
- **Stone Ground** (`bg`): the page behind everything; not cream.
- **Panel White** (`panel`) and **Recess** (`panel-2`): work surfaces; recess is hover rows, table headers, segmented-control track, search field at rest, skeletons.
- **Hairline** (`line`) and **Strong Hairline** (`line-strong`): panel borders and dividers; strong for secondary buttons, selects, chart axes and tooltip borders.
- **Ink** (`ink`, `ink-2`, `ink-3`): headings and figures; body and secondary copy; meta, captions, axis labels, placeholders.
- **Navy Answer** (`rail`, `rail-2` hover, `rail-line` dividers and outline buttons, `rail-ink` / `rail-ink-2` text): the one emphasis surface per screen.
- **Critical** (`crit`, `crit-soft`): load errors and the synthetic-data banner only.

### Named Rules
**The One Blue Rule.** Blue is the only hue for action and for data that is not about the visitor. A single-series chart is blue whatever it counts; never pick a series colour for variety.

**The Teal Means You Rule.** Teal appears only where the thing is something the visitor has. Amber appears only for a gap, a caution, or a small sample. Neither is ever a data hue for the market.

**The Selected-Per-Theme Rule.** Dark values are chosen, not computed: every token has its own dark value under `[data-theme="dark"]` (sidecar `themes.dark`), and charts read colours from the live CSS tokens so both themes stay in step. On the dark blue (`accent` #7f9cff) the on-accent text is the dark ground, not white.

## Typography

**Display Font:** Geist Variable (with Segoe UI, system-ui)
**Arabic Font:** Readex Pro Variable (falls in per glyph from the same stack; both faces are preloaded)
**Label/Mono Font:** none distinct; figures use Geist with tabular numerals

**Character:** One neutral, precise grotesk at three weights (400, 500, 600) with tight negative tracking on headings; Readex Pro gives Arabic the same open, even colour. No serif, no display face, no uppercase labels.

### Hierarchy
- **Display** (600, 2rem/2.375rem mobile, 2.75rem/3.125rem from 640px, -0.03em): Home's value line only.
- **Headline** (600, 1.5rem/2rem mobile, 1.75rem/2.25rem from 640px, -0.02em): page titles (`PageHeader`), with a 15px/24px `ink-2` description under them, max 48rem.
- **Answer** (600, 1.25rem/2rem mobile, 1.5rem/2.25rem from 640px, -0.015em, balanced): the sentence on the navy answer band.
- **Figure** (600, 1.5rem/2rem, -0.02em, tabular): KPI values and a posting's salary.
- **Title** (600, 0.9375rem/1.5rem, -0.005em): panel titles; section titles on Home step up to 1rem/1.5rem at -0.01em.
- **Body** (400, 0.875rem/1.375rem): default copy and table text; prose paragraphs cap near 42–48rem and use `text-wrap: pretty`.
- **Body small** (400/500, 0.8125rem/1.25rem): controls, nav items, meta lines, readouts.
- **Label** (400/500, 0.75rem/1rem, sentence case): KPI labels, nav group names, captions, legends, "n =" notes.

### Named Rules
**The Tabular Figures Rule.** Every number that can sit beside another (KPIs, tables, counts, shares, salaries) uses tabular numerals (`.tnum`, `.kpi`, all tables).

**The Sentence-Case Rule.** Labels, group names and pills are sentence case at 12px in `ink-3`; nothing is uppercased or letter-spaced to look like a kicker.

## Layout

A fixed 248px sidebar from 1024px (sticky, full height, `line` end border) beside a fluid main column; below 1024px the sidebar becomes a full-screen sheet under a 56px top bar opened from a menu button. The top bar (56px, 64px from 1024px) is sticky, translucent `panel` at 90% with backdrop blur, and carries job search (max 28rem), the profile chip, language and theme. Market pages add the sticky filter bar under it; pages whose content ignores filters (Home, plan, compare, methodology) hide it.

Main content caps at 1600px with 16 / 24 / 32px side padding (base / 640px / 1024px) and 24px / 32px vertical padding. Pages stack sections with 24px gaps; Home uses 40px / 56px between its bands and splits into two columns from 1280px (value line and profile entry beside the navy preview; newest jobs at 1.35fr beside skills in demand and where the postings are). Panels pad 20px with a 16/12px header. Controls share a 36px height (28px icon buttons, 32px chips, 40–48px for the primary Home entry).

The posting detail opens as an end-side drawer (full width on mobile, min(600px, 92vw) above), and sticky side panels sit below the measured header height (`--filters-h`).

**The Logical Sides Rule.** Every directional value is logical (`ms/me`, `ps/pe`, `start/end`, `border-s/e`, `rounded-s/e`); arrows rotate 180° in RTL; charts are mirrored by one shared function rather than per chart; strip segments grow from the reading-start edge. Mixed-direction strings (titles, employers, places) carry `dir="auto"` or `<bdi>`.

## Elevation & Depth

Flat by default. Depth comes from tone (stone ground, white panel, recess) and 1px hairlines. A real shadow exists once, as `--shadow`, and belongs only to layers that float over content: popovers, the facet and skill pickers, the "more filters" sheet, the posting drawer and chart tooltips. Two hairline lifts are part of controls: the secondary button's 1px under-edge and the selected segment of a segmented control.

### Shadow Vocabulary
- **Floating layer** (`box-shadow: 0 1px 2px rgba(14,21,37,0.05), 0 8px 24px -6px rgba(14,21,37,0.12)`; dark: `0 1px 2px rgba(0,0,0,0.35), 0 10px 28px -8px rgba(0,0,0,0.5)`): popovers, drawer, chart tooltip.
- **Control edge** (`box-shadow: 0 1px 0 rgba(14,21,37,0.04)`): secondary buttons.
- **Selected segment** (`box-shadow: 0 1px 2px rgba(14,21,37,0.1)` with a `line` ring): the active option of a segmented control.
- **Hero field** (`box-shadow: 0 1px 2px rgba(14,21,37,0.05)`): Home's large job search field.

### Named Rules
**The Floats-Only Rule.** Panels, cards, answer bands and lists never cast a shadow; a shadow means the layer is above the page and can be dismissed.

## Shapes

Softly squared, never pill-shaped except for status pills and tiny dots. Controls (buttons, inputs, selects, nav items, facet chips, skill chips) are 8px; panels, popovers, the KPI strip, posting lists and the Home search are 12px; the navy answer band is 16px, the only larger radius. Icon buttons, callouts and matrix cells use 6px, segmented options 4px. Borders are 1px `line` (or `line-strong` on inputs and secondary buttons); dashed borders carry one meaning, "added / not yet yours": the Add skill trigger, the team-added pill, small-sample outlines in the matrix.

The coverage strip has its own geometry: 5px segments with 3px gutters and 8px outer ends (2px gutters, 3px segments in the mini strip).

## Components

### Buttons
Restrained and solid; the blue button is the one call to action in a region.
- **Shape:** gently squared (8px), 36px high, 14px inline padding, 13px medium text, 6px icon gap.
- **Primary:** `accent` fill, white text (dark ground text in dark mode); hover to `accent-ink`.
- **Secondary:** `panel` fill, `line-strong` border, `ink` text, 1px control edge; hover to `panel-2`.
- **Ghost:** no fill, `ink-2` text; hover `panel-2` fill and `ink` text.
- **On navy:** a white `panel` button with `ink` text for the band's next step ("Open your plan"), and an outline variant with `rail-line` border and `rail-ink` text, hover `rail-2`.
- **Icon button:** 28px square, 6px radius, `ink-3` icon at 15px; hover `panel-2`; pressed state uses `accent-soft` / `accent-ink`.
- **Focus:** 2px `accent` outline, 2px offset, everywhere.

### Chips
- **Facet chip (filters):** 36px, 8px radius, `line` border, `ink-2` text, chevron; with selections it turns `accent-soft` with `accent-line` border, `accent-ink` medium text and a white count badge.
- **Skill you have:** 32px, `good-soft` fill, `good` medium text, an inline 24px remove button.
- **Add skill:** 32px, dashed `line-strong` border, `ink-2` text; hover border `accent`, text `accent-ink`.
- **Pills:** 12px medium, full radius: neutral (`panel-2`, ring `line`), accent, warn (`warn-soft`/`warn`), good, and added (dashed `ink-3` border).

### Cards / Containers
- **Corner Style:** 12px (`rounded.xl`).
- **Background:** `panel` on `bg`.
- **Shadow Strategy:** none (see The Floats-Only Rule).
- **Border:** 1px `line`.
- **Internal Padding:** 20px; title row with optional info tip and action icons (table view, PNG/CSV download) at the end.
- **Chart panels** always offer a table view of the exact aggregate and a download.
- **KPI strip:** one bordered 12px panel divided into 2 / 3 / 6 cells by hairlines; each cell is a 12px `ink-3` label over a 24px tabular figure and a 12px denominator line. A changed figure flashes `accent-soft` (1.6s) and keeps a 6px blue dot.

### Inputs / Fields
- **Style:** 36px, 8px radius; the top-bar search rests on `panel-2` with a `line` border and a leading 16px search icon; selects are `panel` with `line-strong` border. Home's job search is 48px and 12px radius beside a 48px blue button.
- **Focus:** border to `accent`, fill to `panel`, plus a soft `accent` ring at 25% (15% on the large Home field).
- **Error:** full-width `crit-soft` block with `crit` icon, message and a Try again secondary button.

### Navigation
- **Sidebar:** brand mark (32px navy square holding two teal bars and one amber outlined square, a miniature coverage strip) with "Bosla" / "Your tech career compass"; groups Discover, You, Market, Tools, About the data with 12px `ink-3` names; 36px items, 8px radius, 16px icons at 1.75 stroke in `ink-3`. Hover `panel-2`; active `accent-soft` fill with `accent-ink` medium text and a blue icon. A footer carries the data build date and the sample caveat.
- **Top bar:** search, then at the end the profile chip (role and skill count, route icon in blue; "Add your skills" when empty), the language switch labelled in the other language, and the theme toggle.
- **Mobile:** menu button and brand mark replace the sidebar; the sheet fills below the top bar and closes on Escape or navigation.

### Navy Answer Band
The page's answer as a sentence on `rail`, 16px radius, 24px / 28px padding (32px on Home): an `answer`-style sentence, a 14px `rail-ink-2` line with n and caveats (warn pills allowed), an optional white inset panel (12px radius, 16px padding) holding a coverage strip, and next steps as on-navy buttons over a `rail-line` divider. Used on Home (match preview), My skills & plan (where you stand), Salaries (median with n), and a skill's profile.

### Coverage Strip (signature)
A role's or a posting's requested skills as one segmented bar.
- **Full (36px):** segment width = how often the role asks for the skill (normalised, minimum 4% so rare skills stay visible); `good-fill` = you have it; `warn-soft` with a 1.5px inset `warn-fill` outline = to learn; diagonal hatching (135°, 4px pitch) = added by the team rather than written in the posting, so provenance is never colour alone. A live readout above names the hovered or focused skill, its share and your status; non-active segments drop to 45%; the active one gets a 2px panel + 2px ink ring. Click adds the skill or opens it. A caption legend names have / to learn counts, "Width = how often the skill is asked for" and the hatching when present. Segments grow in once from the start edge (420ms, 28ms stagger).
- **Mini (8px):** in job rows beside "n of m skills"; same grammar with have segments first, then gaps by demand; 3px radius, 2px gutters; one `role="img"` label.
- Always drawn on white: on the navy band it sits inside a white inset panel.

### Role × Skill Matrix
A grid of `panel-2` cells (6px radius) with a blue dot whose area grows with the share (blue mixed into the recess from 30% to 100%); dashed amber outline and amber count mark small groups; a live readout names the cell; arrow keys move between cells.

## Do's and Don'ts

### Do:
- **Do** put each screen's answer in one navy band as a sentence with its n, then the evidence below on white panels.
- **Do** colour every single-series chart and the matrix with `accent`, sources with `s6`, and reserve `s2`–`s5` for charts with two or more series and a legend.
- **Do** use `good-fill` only for skills the visitor has and `warn-fill` / `warn-soft` only for gaps, cautions and small samples.
- **Do** pair every hue-coded state with a second cue: dashed or hatched for team-added, a written label or readout for have / to learn.
- **Do** use tabular figures for every number and show the denominator next to it.
- **Do** use logical properties for every side, `dir="auto"` / `<bdi>` for data strings, and let the shared mirror handle charts in RTL.
- **Do** give every token its own dark value; read chart colours from the CSS tokens at render time.
- **Do** keep the profile visibly local: "Saved in this browser only" wherever it is edited.

### Don't:
- **Don't** use the navy surface more than once per screen, as a theme, or as a sidebar.
- **Don't** use teal or amber as a market data hue or for decoration.
- **Don't** put a shadow on a panel, card, list or answer band; shadow is for floating layers only.
- **Don't** go above 12px radius except the navy answer band (16px), or use pill shapes for buttons.
- **Don't** uppercase or letter-space labels into kickers or eyebrows above headings.
- **Don't** set a second display face or a serif; Geist and Readex Pro carry everything.
- **Don't** add physical `left`/`right` margins, paddings or positions.
- **Don't** imply accounts, saved jobs or settings that do not exist.
