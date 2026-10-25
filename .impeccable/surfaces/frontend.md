---
version: 1
slug: "frontend"
primary_target: "frontend"
related_targets: []
---

## Scope

The whole dashboard (frontend/): app shell + 12 modules. Visitor mode: Operate.
Audience: students, job seekers, advisors, evaluators (see PRODUCT.md). Task: filter the
posting sample, read demand / skills / pay / geography, drill to postings, plan learning.
Constraints: server-side data only, every figure with n and provenance, AA contrast, RTL text.

## Direction contract

THESIS: A job-market tool that reads like a working analytics product, where demand is light
coming through a lattice: the role × skill matrix is the one place the world speaks. Refuses the
category default of a grey card grid with one blue accent and a hero-metric row.

OWN-WORLD: Cairene mashrabiya. Deep teak rail and header (#24180F family), shaded-plaster
ground (cool off-white, never cream), white work panels with hairline plaster borders, sunlit
amber reserved for selection, focus and the lattice light; data series from qamariyya stained
glass, one hue per kind of entity in every module: posting attributes cobalt, skills turquoise,
places emerald, pay amber glass, sources and collections violet, decreases ruby (finish-review
fix). Night mode: dark teak ground, same glass.
One sans with Arabic + Latin (Readex Pro), tabular figures, tight 1.125 scale.

STORY: The visitor sees the population they are looking at, the demand for roles and skills in
it, and one click takes them to the postings, a skill, a market or a career plan.

FIRST VIEWPORT: Teak left rail (product name, 12 modules grouped Explore / Analyze / Plan /
Trust). Top: global filter bar with chips + population line ("188,586 postings · 2023 archive ·
skills incl. team-added"). Overview body: KPI strip (six figures, each with denominator), then
two columns: top roles bar chart + top skills bar (observed vs added split), then the lattice
(roles × skills) at full width, then geography, salary, cohorts.

FORM: Mashrabiya lattice world, position 7 of 7 on the grounded list. seed:792994a690522073
Signature interaction: the lattice; hover or keyboard focus lights an aperture and keeps its
row and column lit while every other cell dims (a reading crosshair; adapted at the finish
review so the row and column stay comparable), click or Enter drills to postings for that
role + skill.
Raises: nothing labelled twice (Saville sleeve); a changed figure stays marked after a filter
edit (gate board); focus dims the rest (streaming wall); one size does the work (acetate
manual); amber only where you can press or what is selected (warm consumer app); table columns
never move, rows re-rank (split-flap).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
