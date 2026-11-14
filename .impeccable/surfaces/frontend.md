---
version: 1
slug: "frontend"
primary_target: "frontend"
related_targets: []
---

## Scope

The whole web app (frontend/): app shell + Home, Jobs (explorer + job detail with match analysis),
My skills & plan (career), Market (overview, skills, salaries, locations, employers, trends, compare),
Tools (guided insights, insight builder), Methodology. Visitor mode: Operate (Home leads with
the product itself, not a marketing hero).
Audience: job seekers and students first (PRODUCT.md), then advisors and evaluators.
Task: find jobs, see where my skills fit, know what to learn next, read the market.
Constraints: server-side data only; every figure keeps its n and provenance; match is overlap with
listed skills, never a hiring probability; no saved jobs, settings or accounts exist and none are
invented; your skills live in the browser only; AA contrast; Arabic RTL; light and dark.

## Direction contract

THESIS: A career intelligence product, pinned by the user as "Premium Editorial Intelligence":
the market explained to one person. Refuses the grey KPI-card admin template and the dark neon
console; the product's own answer (what you have, what you lack) leads every screen.

OWN-WORLD: Light stone ground (#f6f6f3 family, not cream), white work surfaces with fine
hairlines, deep navy-charcoal ink, one restrained deep blue for action, selection and data;
muted teal means "you have it", controlled amber means "gap". Geist for Latin, Readex Pro for
Arabic, tabular figures. Navy surface used once per screen for emphasis (the answer), never as
a theme. Radii 8-12px, almost no shadow.

STORY: The visitor names a role and their skills once; every page then speaks to them: jobs show
coverage, a posting shows have/missing ranked by how much the role asks for each, the plan shows
the next skills, the market pages show where demand and pay sit, each with its sample.

FIRST VIEWPORT: Light sidebar (brand, Discover / You / Market / Tools / Data groups), top bar
with job search, profile chip and language/theme. Home: left, value line and search with role
and skill entry; right, a live preview of the coverage strip for the visitor's role (the plan
entry, "Open your plan"); below, the Jobs entry as the newest postings for that role with their
mini strips (wider column), and the Market entry as skills in demand plus where the postings
are, each linking on. Amended at finish review: three equal entry rows would have repeated the
plan the navy preview already opens, and showing real postings proves the product faster.

FORM: Pinned by the user's brief (no roll card chosen); grounded list position n/a.
seed:9a3a735b2902afdc. Signature interaction: the coverage strip: a role's or posting's
requested skills as one segmented bar, segment width = how often the role asks for the skill,
filled teal where you have it and amber-outlined where you lack it; hover or focus names the
skill and its share, click opens the skill or adds it to your plan. Same strip in job rows (mini),
job detail (full, labelled) and the plan.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
