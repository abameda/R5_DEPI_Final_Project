# Roadmap page: design

Date: 2026-10-29 · Status: builder check done; awaiting the user's approval of this document

## Why

Visitors pick a target role in Bosla and want to know what to learn and in what order. The
user wanted roadmaps per track, like roadmap.sh. roadmap.sh content cannot be used: its license
allows personal use and links only, and forbids publishing its text, images or data in any other
site. Bosla is public on Vercel. Its pages also send `X-Frame-Options: SAMEORIGIN`, so embedding
is blocked too. There is no public API.

So the roadmap is built from Bosla's own postings, ordered by what employers ask for. A link out
to the matching roadmap.sh page covers the learning material legally.

## Goals

- A new **Roadmap** page that turns a role's skill demand into an ordered path with three stages:
  Foundations → Core → Stand out.
- It shares the saved profile (target role + skills) with **My skills & plan**, so ticks and the
  chosen role carry across both pages.
- One-tap "I have this" on every skill, and a progress count ("2 of 18 done").
- A "Learning resources on roadmap.sh" link for roles with a clear match.

## Non-goals

- Any roadmap.sh content beyond a link (no fetching, scraping, copying or framing).
- Learning links or courses for each skill.
- Changing **My skills & plan**. It keeps its "What to learn next" list.

## Anti-goals (a failure even if it works)

- Copying roadmap.sh's look closely enough to read as a clone.
- Presenting stages as a guarantee of getting hired. Keep the app's existing wording: overlap
  with postings, not hiring odds.
- Showing junk skill names (word-matching noise) as steps on the path.

## The page (layout A, "vertical path", picked by the user from mockups)

- Route `/roadmap`. Nav item "Roadmap" / «خارطة الطريق», placed right after "My skills & plan"
  in `frontend/src/components/Shell.tsx`.
- Header: a `PageHeader` with title and a one-line description. Below it, the role picker (the
  same role list and default as `Career.tsx`: `meta.dimensions.role_category` minus
  "Other / Unclassified") and a pill with "N of M done".
- Body: a vertical line with three stage markers. Each stage has a title, a one-line rule
  ("In 25%+ of postings") and a two-column grid of skill chips (one column on phones).
- Each skill chip shows the name and its share of postings (Foundations, Core) or its pay
  premium within markets (Stand out, see the stage rules). It is ticked and green when the skill is in the profile. Clicking
  the name opens the skill on the Skills page, the way other pages already link there. A "+"
  button adds the skill to the profile; when the skill is already ticked, the button removes it.
- Below the path: the roadmap.sh link(s), opening in a new tab with `rel="noopener noreferrer"`.
- The market switch and global filters apply, as on `Career.tsx` (the role filter is replaced by
  the picked role).
- Every new string in English and Arabic through `t()`. The layout works in RTL; the line sits on
  the inline-start side.
- Follow DESIGN.md and the existing tokens (`text-ink`, `bg-panel`, `good`/`warn` tones, `Panel`,
  `Guard`, `Empty`). The mockup colours were placeholders.

## Stage rules

Population: the current filters with `role = [picked role]`, as in `career_gap`
(`api/queries/skills.py`). Candidates: `top_skills(..., limit=40)` for that population, minus
the exclude list. Each skill appears in exactly one stage, checked in this order:

1. **Foundations:** share ≥ 25%. If fewer than 3 skills qualify, take the top 3 by share.
2. **Core:** the rest with share ≥ 5%, ranked by `wilson_lower`, at most 8.
   *Builder's call, changed from the chat version:* the chat described Core as "often appears
   next to the foundations" with a lift ≥ 1.5. In big roles the foundations cover most postings,
   so that lift sits near 1 and Core would come out empty. A plain share band is simpler and
   stays honest.
3. **Stand out:** candidates with share under 5% (true niche skills; skills that missed the
   Core cap of 8 are dropped, not moved here; *builder's call*) that pay more **within the
   same market** (decided by the user). Salaries differ a lot between markets, so a pooled
   comparison would credit a skill for where it is asked for, not for what it adds:
   - For each `market_type` in the population, take the role's median advertised
     `salary_usd_annual` (R_m) and the median for role postings listing the skill (S_m). Use a
     market only when both have at least `MIN_SALARY_N` (10) advertised salaries.
   - Premium = the average of (S_m − R_m) / R_m over the usable markets, weighted by the skill's
     advertised-salary count in each.
   - A skill qualifies when its usable markets add up to at least `RELIABLE_SALARY_N` (30)
     salaries and the premium is above 0. Rank by premium, at most 6.
   - The chip shows the premium ("+12% pay"), not a dollar median, since a pooled dollar figure
     would mislead. A tooltip names the markets it was computed from.
   - Hide the stage when nothing qualifies. When a single market is picked, this reduces to a
     plain comparison inside that market.

If the role has fewer than `MIN_GROUP_POSTINGS` postings that list skills, return the same
`too_few_postings` status as `career_gap`, and the page shows the same `Empty` message as
**My skills & plan**.

Skills mostly added by the team (`added > observed`) keep the "mostly team-added" marker used on
`Career.tsx`. When provenance is `all`, show the same info callout.

### Exclude list

Some "skills" are word-matching noise. In Data Analysis & BI postings, "Go" is listed in 5.2% and
"Flow" in 4.6%. Keep a small exclude list in the roadmap query.
*Builder's call:* "Go" is a real language for Backend and DevOps, so exclude it only for
`Data Analysis & BI`, `Data Engineering` and `Data Science & AI`. Check "Flow" by sampling
postings before deciding whether to exclude it everywhere or keep it. The list stays local to
this page and does not change the Skills pages.

## API

`GET /api/career/roadmap?target_role=…&have=…` plus the standard filters, added in `api/main.py`
next to `/api/career/gap` and cached through `cached("roadmap", …)`. The logic lives in a
`career_roadmap(store, f, role, have)` function in `api/queries/skills.py`, reusing
`top_skills`, `wilson_lower`, `share` and the label constants.

Response shape (the builder may adjust names to match `CareerGap`):

```json
{
  "role": "Data Analysis & BI", "denominator": 143028, "status": "ok", "provenance": "all",
  "min_group": 30,
  "stages": [
    {"key": "foundations", "skills": [{"skill": "SQL", "category": "…", "share": 0.618,
      "postings": 88400, "observed": 0, "added": 0, "have": true}]},
    {"key": "core", "skills": [ … ]},
    {"key": "stand_out", "skills": [{"skill": "Looker", "share": 0.046,
      "premium": 0.12, "salary_n": 412, "markets": ["International"], "have": false}]}
  ]
}
```

Add the matching TypeScript type to `frontend/src/lib/types.ts`.

## roadmap.sh links

A fixed map in the frontend from role to roadmap.sh paths. Every path below returned HTTP 200 on
2026-10-29, except `ios`, which the builder must check:

| Role | Paths |
|---|---|
| Data Analysis & BI | `/data-analyst`, `/bi-analyst` |
| Data Engineering | `/data-engineer` |
| Data Science & AI | `/ai-data-scientist`, `/machine-learning` |
| DevOps & Cloud | `/devops` |
| Backend | `/backend` |
| Frontend | `/frontend` |
| Full Stack | `/full-stack` |
| Cybersecurity | `/cyber-security` |
| QA & Testing | `/qa` |
| Product & Project | `/product-manager` |
| Design & UX | `/ux-design` |
| Mobile | `/android`, `/ios` |

Software Engineering, Other Engineering, IT Support & Networking and Embedded & Hardware get no
link. The link text names the roadmap ("Data Analyst roadmap on roadmap.sh"), with a short note
that it is an external site.

## Tests

- API: a pytest for `career_roadmap` against the demo/synthetic store covering: stages don't
  overlap, the Foundations fallback to 3, the `too_few_postings` path, and that excluded skills
  are dropped, the within-market premium (a skill paid more only because it sits in a
  higher-paying market must not qualify), and that the Core overflow does not reach Stand out.
- E2E: extend `frontend/e2e/app.spec.ts` (and `mobile.spec.ts` for the one-column layout). The
  page loads, ticking a skill updates the "done" count, and the tick shows on `/career`.

## Left to the builder

Component split, exact copy, stage icons, the empty-stage wording, caching key details and test
file names, all within the existing patterns.
