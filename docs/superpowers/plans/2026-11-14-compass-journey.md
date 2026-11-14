# Compass Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Bosla into one guided journey: a three-step start on Home and a personal Compass page with a Global Skill Match dial, gap chips, location-scoped pay and jobs. Every figure is real and labelled with its sample size, dates and scope. Arabic and English are supported throughout.

**Architecture:** Front end only (React 19 + Tailwind 4 + ECharts), with no API changes. Every endpoint used already accepts the filters needed. Two small pure modules carry the rules:
- `lib/profile.ts` gains a saved `where` field.
- A new `lib/match.ts` builds the filters for each match scope (`global` now, `local` later) and maps the score to the dial angle.

`pages/Career.tsx` becomes `pages/Compass.tsx` at `/compass`, and `/career` redirects there with its query string.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Tailwind 4, ECharts 6, TanStack Query 5, lucide-react, Vitest 5, Playwright 1.64 with axe; FastAPI + DuckDB (unchanged).

**Spec:** `docs/superpowers/specs/2026-11-14-compass-journey-design.md`

## Starting point (verified 2026-11-14)

The other session finished its work but left it **uncommitted** on `feature/dashboard`:
- **Fresh job collection:** `src/collectors.py` reads 9 official public job APIs, adds a 9th source and rebuilds `data/analytics/jmi.duckdb`.
- **Where to search:** `/api/platforms` with `api/queries/platforms.py` and `components/WhereToSearch.tsx`, used on the Career page.
- **Employer report card:** in `api/queries/market.py` and `pages/Employers.tsx`.
- **Every board a posting was listed on:** `listings` on job detail, with "Also posted on…" and safe advert links in `JobDetail.tsx` and `lib/format.ts`.

With that work in place, the baseline is green: pytest 141 passed, `tsc --noEmit` clean, Vitest 13 passed. The live store holds 591,142 postings dated 2021-08-10 to 2026-11-14. Of those, 96.6% are from the 2023 archive and 20,139 from the 2024–26 collection.

Data facts the design must respect, checked against the live API:

| Fact | Value | What it means for the build |
|---|---|---|
| Data Analysis & BI postings from the 2023 archive | 99.8% | The freshness line must say so. |
| Recent-only (2024–26) samples that list skills | Data Analysis & BI 297, Software Engineering 4,125, Frontend 493, Backend 1,090 | All above the 30-posting minimum, so a "Recent postings" option is real. |
| Advertised pay for Data Analysis & BI | 87% from the United States | The pay panel must name where the pay comes from. |
| Egypt advertised pay in total | 130 postings, none in data roles | The demo will show the honest "too few" state with "See Arab countries instead". |
| Arab advertised pay for Data Analysis & BI | 20 postings | Shown with a low-confidence label. |

## Global Constraints

- Never show a number without its sample size. Never invent a number. All numbers come from API responses.
- The match score is always called **Global Skill Match** (English) / «التوافق العالمي للمهارات» (Arabic). It never implies local requirements and never implies a probability of being hired.
- **Location applies to pay and jobs only.** The `global` match scope removes `country`, `region` and `market`.
- Pay is USD per year, with per month beside it (÷12). No EGP. The panel never falls back to a broader market silently.
- Minimums: `MIN_GROUP_POSTINGS` = 30 skill postings (the API returns `status: "too_few_postings"` below it); `MIN_SALARY_N` = 10 and `RELIABLE_SALARY_N` = 30 salaries (the API returns `confidence` `insufficient` / `low` / `ok`). Read them from `meta.thresholds`, never hard-coded.
- Type: body text 15px, labels and chart axes at least 13px. The `--ink-3` text token must have a contrast of at least 5.5:1 on `--bg` and `--panel`, in light and dark themes.
- Motion: one animation per user action, 400–700 ms, no loops, turned off under `prefers-reduced-motion: reduce`.
- Keep every existing feature, including the other session's: WhereToSearch, the employer report card, listings and advert links, the fresh source.
- Every user-facing string goes through `t(en, ar)`. In right-to-left layout, the dial fills from the right and arrows use `rtl:rotate-180`.
- Commits carry only the user's name. No co-author trailer, by the user's standing preference.
- **No merge, no push to `main`, no deploy** without the user's explicit approval.

## Review Focus

1. **Old saved profiles without `where`** (and corrupted values). These must load as `"any"` and must not crash. Pinned in Task 1.
2. **A shared link from before the change** (`/career?target=…&have=…`). It must land on `/compass` with the role and skills applied. Pinned in Task 6's e2e test.
3. **A Global Skill Match while URL filters such as `?market=Arab` or `?country=Egypt` are set.** The match must ignore them, and only pay and jobs follow the profile's location. Pinned in Task 2's unit test and Task 6's e2e test.
4. **A role and location with no advertised pay** (Egypt plus a data role). The panel must say "too few" and offer the broader market explicitly. It must never show US figures under an Egypt label. Pinned in Task 5.
5. **Arabic plus reduced motion.** The dial must mirror, numbers must be correct without animation, and the axe check must be clean. Pinned in Task 9.

---

### Task 0: Save the other session's work as its own commit (needs your go-ahead)

**Files:** everything the other session changed, excluding `graphify-out/` (regenerated in Task 9).

- [ ] **Step 1:** Run `git status --short` and confirm the change list matches "Starting point" above (29 modified files plus 4 new: `api/queries/platforms.py`, `frontend/src/components/WhereToSearch.tsx`, `frontend/src/lib/format.test.ts`, `src/collectors.py`).
- [ ] **Step 2:** Run `pytest -q`, `npx tsc --noEmit -p frontend`, `npx vitest run` (in `frontend`) and `npx playwright test` (in `frontend`). Expected: all pass. If Playwright fails, stop and report; do not fix the other session's work silently.
- [ ] **Step 3:** Commit on `feature/dashboard`:

```bash
git add -- . ':!graphify-out'
git commit -m "Add fresh job collection, where-to-search, employer report card and listing links"
```

- [ ] **Step 4:** Branch for this work: `git switch -c feature/compass-journey`.

### Task 1: Profile remembers where you'd work

**Files:**
- Modify: `frontend/src/lib/profile.ts`
- Test: `frontend/src/lib/profile.test.ts`

**Interfaces:**
- Produces:
  - `export type Where = "egypt" | "arab" | "remote" | "international" | "any"`
  - `export const WHERE_VALUES: readonly Where[]`
  - `Profile { role: string; skills: string[]; where: Where }`
  - `useProfile()` now also returns `setWhere(w: Where): void`
  - `export function whereFilters(w: Where): Partial<Filters>`, mapping:
    - `egypt` → `{ country: ["Egypt"] }`
    - `arab` → `{ market: ["Arab"] }`
    - `remote` → `{ market: ["Remote"] }`
    - `international` → `{ market: ["International"] }`
    - `any` → `{}`
  - `export function broaderWhere(w: Where): Where | null`, mapping egypt → arab, arab → any, remote → any, international → any, any → null

- [ ] **Step 1: Write the failing tests** in `profile.test.ts`:
  - `whereFilters("egypt")` equals `{ country: ["Egypt"] }`, and `whereFilters("any")` equals `{}`.
  - `broaderWhere("egypt") === "arab"`, `broaderWhere("arab") === "any"`, `broaderWhere("any") === null`.
  - A stored profile `{"role":"Backend","skills":["SQL"]}` (no `where`) reads as `where: "any"`. A stored profile with `where: "mars"` also reads as `"any"`.
- [ ] **Step 2:** Run `npx vitest run src/lib/profile.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. To test reading, export `readProfile(raw: string | null): Profile`, the pure part of today's `read()`, and have `read()` call it with `localStorage.getItem(KEY)`. Keep the storage key `jmi-profile`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `git commit -am "Profile remembers where you'd work"`.

### Task 2: Match scopes and the dial angle

**Files:**
- Create: `frontend/src/lib/match.ts`
- Test: `frontend/src/lib/match.test.ts`

**Interfaces:**
- Consumes: `Where`, `whereFilters` (Task 1); `Filters`, `EMPTY_FILTERS` (`lib/filters.ts`).
- Produces:
  - `export type MatchScope = "global" | "local"`
  - `export type Recency = "all" | "recent"`
  - `export const LOCATION_KEYS = ["country", "region", "market"] as const`
  - `export function matchFilters(base: Filters, scope: MatchScope, where: Where, recency: Recency): Filters`. Always clears `role` (the role is sent as `target_role`). `global` clears every `LOCATION_KEYS` entry. `local` replaces them with `whereFilters(where)`. `recency: "recent"` sets `cohort: ["collected_2026"]`, and `"all"` sets `cohort: []`. All other keys pass through unchanged, including `provenance`.
  - `export function scopeText(scope: MatchScope): { name: string; note: string }`. For `global`: name `t("Global Skill Match", "التوافق العالمي للمهارات")`, note `t("Skills asked for across all markets. Not specific to Egypt or your chosen location.", "المهارات المطلوبة في كل الأسواق، وليست خاصة بمصر أو بالمكان الذي اخترته.")`. For `local`: name `t("Local Skill Match", "التوافق المحلي للمهارات")`, note `""` (unused until a local match ships).
  - `export function dialAngle(score: number): number`. Maps 0→-90 and 1→90 linearly. Clamps outside [0, 1]. Non-finite input gives -90.

- [ ] **Step 1: Write the failing tests:**

```ts
const base = { ...EMPTY_FILTERS, country: ["Egypt"], market: ["Arab"], region: ["Arab"], role: ["Backend"], provenance: "observed" };
test("global strips every location filter and the role", () => {
  const f = matchFilters(base, "global", "egypt", "all");
  expect([f.country, f.market, f.region, f.role]).toEqual([[], [], [], []]);
  expect(f.provenance).toBe("observed");
});
test("local applies the profile's location", () => {
  expect(matchFilters(EMPTY_FILTERS, "local", "remote", "all").market).toEqual(["Remote"]);
});
test("recent keeps only the 2024–26 collection", () => {
  expect(matchFilters(EMPTY_FILTERS, "global", "any", "recent").cohort).toEqual(["collected_2026"]);
});
test("dial angle", () => {
  expect([dialAngle(0), dialAngle(0.5), dialAngle(1), dialAngle(2), dialAngle(NaN)]).toEqual([-90, 0, 90, 90, -90]);
});
```

- [ ] **Step 2:** Run `npx vitest run src/lib/match.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `lib/match.ts`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `git commit -m "Add match scopes and the dial angle"`.

### Task 3: Readable over screen share

**Files:**
- Modify: `frontend/src/styles.css` (type scale at lines 131–146; `--ink-3` at lines 21 and 65)
- Modify: `frontend/src/lib/echarts.ts:53-71` (chart font sizes)
- Create: `frontend/src/lib/motion.ts`
- Test: `frontend/src/lib/tokens.test.ts`

**Interfaces:**
- Produces:
  - `export function usePrefersReducedMotion(): boolean`
  - `export function useCountUp(target: number | undefined, ms = 600): number | undefined`. Uses an ease-out animation driven by `requestAnimationFrame`. Returns `target` immediately when reduced motion is on or on first render with no previous value. Starts from the previous value when the target changes.

- [ ] **Step 1: Write the failing test** `tokens.test.ts`. It reads `styles.css` with `fs`, extracts `--bg`, `--panel` and `--ink-3` for the light block and the dark block, computes WCAG contrast, and asserts `>= 5.5` for each pair.
- [ ] **Step 2:** Run it. Expected: FAIL (light `#5f6678` on `#f6f6f3` is about 5.3).
- [ ] **Step 3:** Darken light `--ink-3` and lighten dark `--ink-3` until the test passes, keeping the hue. Set the scale:

| Token | Size |
|---|---|
| `--text-xs` | 0.8125rem |
| `--text-sm` | 0.875rem |
| `--text-base` | 0.9375rem |
| `--text-lg` | 1.0625rem |

  Raise ECharts `fontSize` to 13 for `axisLabel` and `nameTextStyle`, and to 14 for `textStyle` and the tooltip. Add `lib/motion.ts`.
- [ ] **Step 4:** Run `npx vitest run` and `npx tsc --noEmit -p .`. Expected: PASS. Open `/`, `/market` and `/salary` at 1280×720 and check that no label is clipped and no layout overflows. Fix any that are, in the component that clips.
- [ ] **Step 5:** Commit: `git commit -am "Raise type size and contrast for screen sharing"`.

### Task 4: The Compass dial

**Files:**
- Create: `frontend/src/components/CompassDial.tsx`

**Interfaces:**
- Consumes: `dialAngle` (Task 2); `useCountUp`, `usePrefersReducedMotion` (Task 3).
- Produces: `export function CompassDial(props: { score: number; name: string; size?: "lg" | "sm" }): JSX.Element`. `name` is the scope name from `scopeText`.

**Contract:**
- An inline SVG half-dial. The track uses `line-strong`, the filled arc uses `accent`, and the needle is `ink` with a hub. There are compass ticks at 0, 25, 50, 75 and 100%. The centre shows the percentage as `fmtPct(score, 0)` from `useCountUp(score)` in `figure` typography.
- The needle rotates with a CSS `transform: rotate(...)` transition of 600 ms `cubic-bezier(.2,.8,.2,1)`, set to `none` under reduced motion.
- The outer element has `role="meter"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow={Math.round(score*100)}`, `aria-label={name}`, and `aria-valuetext` like "38% Global Skill Match".
- In RTL, the graphic group gets `scale(-1,1)` but the text does not.
- Sizes: `lg` is 240px wide and `sm` is 140px.

- [ ] **Step 1:** Build the component. Render it temporarily on `/compass` (Task 6) or check it through Task 6's e2e test. No separate unit test, since the geometry is covered by `dialAngle`.
- [ ] **Step 2:** Commit with Task 6.

### Task 5: Where your pay lands

**Files:**
- Create: `frontend/src/components/PayLands.tsx`

**Interfaces:**
- Consumes: `Where`, `whereFilters`, `broaderWhere` (Task 1); `useApi`; `useMeta` (for `thresholds`).
- Produces: `export function PayLands(props: { role: string; where: Where }): JSX.Element`.

**Contract:**
- Local state `shown: Where` starts at `props.where` and resets when `props.where` changes.
- Data:
  - `useApi<SalarySummary>("/salary/summary", { role:[role], ...whereFilters(shown) }, { dim: "country", kind: "advertised", limit: 3 })` for `overall` (`n`, `p10`, `p25`, `median`, `p75`, `p90`, `confidence`).
  - `useApi<BreakdownRow[]>("/breakdown", { role:[role], ...whereFilters(shown), salary: "advertised" }, { dim: "country", limit: 3 })` for where the pay comes from.
- **Enough data** (`confidence` is `ok` or `low`): draw a horizontal band with p10–p90 as a light bar, p25–p75 as an accent box and the median as a marker. Show the median as `fmtUsdFull` per year, with `≈ $X / month` beside it.
  - Line 1: `t("Advertised pay in {n} {role} postings in {place}")`.
  - Line 2, when the top country has 50% or more: "Mostly {country} postings ({share})".
  - Show `<Pill tone="warn">Low confidence</Pill>` when `confidence === "low"`.
- **Too little data** (`insufficient`, or `overall.n` below `meta.thresholds.min_salary_n`): show `Empty` with "Only {n} {role} postings in {place} state their pay. We need at least {min} to show a range." When `broaderWhere(shown)` exists, add a button "See {broader place} instead" that sets `shown`. The heading always names `shown`, never `props.where`, so the location shown is never hidden.
- Place names: Egypt / مصر, Arab countries / الدول العربية, Remote / عن بُعد, International / دولي, All markets / كل الأسواق.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Pin Review Focus 4 in Task 6's e2e test: with `where=egypt` and a role that has no Egypt pay in the e2e demo store, the "too few" text and the "See Arab countries instead" button show, and clicking it changes the heading to Arab countries. Before writing the test, check that `scripts/make_demo_data.py` produces such a role; if not, pick the role the demo data supports.
- [ ] **Step 3:** Commit with Task 6.

### Task 6: The Compass page

**Files:**
- Rename: `frontend/src/pages/Career.tsx` → `frontend/src/pages/Compass.tsx` (`git mv`, to keep history)
- Modify: `frontend/src/main.tsx` (route `/compass`; `/career` becomes `<Navigate to={{ pathname: "/compass", search }} replace />`)
- Modify: `frontend/src/components/Shell.tsx:27,159`. Nav and top-bar link go to `/compass` with the label `t("Your compass", "بوصلتك")`.
- Modify the links to `/career` in `Explorer.tsx:60`, `Home.tsx`, `Overview.tsx:159` and `Skills.tsx:312` to point to `/compass`.
- Modify: `frontend/src/pages/Roadmap.tsx`. Each skill row gets `id={skillAnchor(skill)}`, and the page scrolls to `location.hash` once data loads.
- Modify: `frontend/src/lib/roadmaps.ts`. Add `export function skillAnchor(skill: string): string`, which returns `skill-` plus a lowercase ASCII slug with non-alphanumerics turned into `-`, for example `skill-power-bi`. Test it in `roadmaps.test.ts`.
- Modify: `frontend/e2e/app.spec.ts` (paths at lines 8, 200, 224, 300, 334) and `frontend/e2e/mobile.spec.ts:19`.

**Interfaces:**
- Consumes: Tasks 1, 2, 4 and 5; the existing `WhereToSearch`, `CoverageStrip`, `SkillPicker`, `Guard` and `Panel`.

**Page contract, top to bottom:**
1. **Profile column** (sticky, as today):
   - role select
   - **Where you'd work**: a `Segmented` with Egypt / Arab countries / Remote / International / Anywhere, bound to `profile.where`. It replaces today's market segment, which wrote global filters.
   - skills, as today
   - a **Share my compass** button that copies `origin + /compass?target=…&have=…&where=…` and shows "Link copied" for 2 s
   - the existing "Also using filters from other pages" note, now listing only non-location filters
2. **Answer band** (navy, `rail`):
   - `CompassDial` showing `scopeText("global").name`
   - the answer sentence: "You have {k} of the {top_k} skills {role} postings ask for most worldwide, about {score} of the demand."
   - the **sample line**: "Based on {denominator} {role} postings that list skills"
   - the **freshness line** from `useApi<Overview>("/overview", { ...matchFilters(...), role:[role] })`: "Posted {first_posted} – {last_posted} · {share of kaggle_2023} from the 2023 archive"
   - a `Segmented` with **All postings / Recent (2024–26)** bound to local `recency` state, default `all`
   - the scope note
   - the `InfoTip` with the formula (existing text) in Advanced mode
   - The gap call is `useApi<CareerGap>("/career/gap", matchFilters(filters, "global", profile.where, recency), { target_role, have })`.
   - When `status === "too_few_postings"` (possible with Recent), show the existing `Empty` message with a button "Use all postings" that sets `recency` to `all`.
3. **Learn next**: up to 6 `priorities` as chips. Each shows the skill, "in {share} of postings", an "I have this" button (`addSkill`) and a "Roadmap" link to `/roadmap#${skillAnchor(skill)}`. When a skill is added, its chip moves to the "you have it" strip with a single 400 ms fade and slide, or none under reduced motion.
4. `PayLands role={target} where={profile.where}`.
5. **Jobs that fit you best**: a second gap call, `useApi<CareerGap>("/career/gap", matchFilters(filters, "local", profile.where, recency), …)`, using only its `postings`. The panel's subtitle names the place. When it is `too_few_postings`, show `Empty` with "See {broader} instead", using `broaderWhere` and local state, as in PayLands.
6. **Where else you fit** (global, existing).
7. `WhereToSearch filters={{ ...matchFilters(filters, "local", profile.where, recency), role: [target] }}` (preserved from the other session).
8. Advanced: every skill, and the provenance callout (existing).
- **Shared-link seeding effect:** reads `target`, `have` and `where` (validated against `WHERE_VALUES`), then tidies the URL (extends today's effect).

- [ ] **Step 1: Write the failing e2e tests** in `app.spec.ts`:
  - `"/career?target=Data%20Engineering&have=SQL" redirects to /compass and applies the profile`. Expect the URL to match `/compass`, the dial to have `aria-label` "Global Skill Match", and SQL to appear among your skills.
  - `the Global Skill Match ignores location filters`. Load `/compass?market=Arab` and `/compass` with the same profile; the meter `aria-valuenow` is equal on both.
  - `adding a skill moves the dial`. Read `aria-valuenow`, click "I have this" on the first chip, and expect a higher value.
  - `pay never hides its location` (Review Focus 4, see Task 5).
  - `the freshness line names the 2023 archive share`. Expect text matching `/from the 2023 archive/`.
- [ ] **Step 2:** Run `npx playwright test e2e/app.spec.ts`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement Tasks 4, 5 and 6.
- [ ] **Step 4:** Run `npx playwright test`, `npx vitest run` and `npx tsc --noEmit -p .`. Expected: all PASS, including every existing test.
- [ ] **Step 5:** Commit: `git add -A frontend && git commit -m "Add the Compass page with the Global Skill Match dial and location-scoped pay and jobs"`.

### Task 7: Home, a three-step start

**Files:**
- Modify: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Consumes: Tasks 1–4; `useCountUp`.

**Contract:**
- **Hero:** the headline and search stay. Under the search, three figures from `/api/overview` kpis count up once on load: postings, countries and distinct skills. Each has a label ("job postings", "countries", "skills tracked"), plus a small line: "Updated {last_posted} · {sources} sources".
- **Get your compass:** replaces "Tell us where you are". It is an ordered list of three steps, each a numbered circle that becomes a check when done:
  1. Role you want (select). Done when the profile has a role.
  2. Skills you have (chips and `SkillPicker`). Done when there is at least one skill.
  3. Where you'd work (`Segmented`, five options). Done when `profile.where !== "any"` or the visitor picked an option during this visit (local `picked` state). So "Anywhere" chosen on purpose also ticks.
- **Right column:** today's `MatchPreview` keeps its navy band. It shows `CompassDial size="sm"`, the answer sentence, the sample line and the scope note, then the "Open your compass" link to `/compass`.
- `NewestJobs` filters by `whereFilters(profile.where)`, and its heading names the place.
- `InDemand`, `Markets` and "About this data" are unchanged; the other session's `sources` count stays.

- [ ] **Step 1: Write the failing e2e test** `Home steps tick off and open the compass`. Choose a role, add a skill, choose Egypt. Expect three checks, then click "Open your compass" and land on `/compass` with Egypt selected.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx playwright test`. Expected: PASS.
- [ ] **Step 5:** Commit: `git commit -am "Home: a three-step start to your compass with live counts"`.

### Task 8: Evidence pages answer first

**Files:**
- Create: `frontend/src/components/KeyPoints.tsx`. It exports `KeyPoints(props: { finding: string; points: { text: string; n: number }[] })`: the finding in `answer` typography, then up to three bullet points, each ending in `· n = {fmtInt(n)}`.
- Modify: `frontend/src/pages/Skills.tsx`, `Salary.tsx` and `Geography.tsx`. Render `KeyPoints` between the `PageHeader` and the first panel, only from queries the page already makes:
  - **Skills** (`/skills/top`, first rows):
    - finding: "{skill1} is asked for in {share1} of postings that list skills"
    - point 1: "{skill2} and {skill3} follow, at {share2} and {share3}"
    - point 2: "{technical vs soft share}" (Advanced only, from `cats`)
    - n = `denominator`
  - **Salary** (`/salary/summary` `overall`):
    - finding: "Half of the {n} advertised salaries here are above {median} a year"
    - point 1: "The middle half sits between {p25} and {p75}"
    - point 2: the highest-paying group from `groups[0]`
    - point 3: the coverage share from `/salary/coverage`
    - When `confidence` is not `ok`, show a low-confidence pill.
  - **Geography** (`/geo/countries` rows and `/overview` markets):
    - finding: "{country1} has {share1} of postings with a country"
    - point 1: "Top 3 countries hold {top3 share}"
    - point 2: "{arab share} are in Arab countries and {remote share} are remote"
- No finding is shown while its query is loading or empty.

- [ ] **Step 1: Write the failing e2e test** `evidence pages state a finding with its sample size`. On `/skills`, `/salary` and `/geography`, expect a heading region matching `/n = \d/`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. The Compass links into these pages through `drillHref` with `role` plus `whereFilters(where)`. Add a "See the evidence" row of three `TextLink`s under the answer band in Task 6's page.
- [ ] **Step 4:** Run `npx playwright test`. Expected: PASS.
- [ ] **Step 5:** Commit: `git commit -am "Skills, Salary and Locations open with a finding and key points"`.

### Task 9: Copy, Arabic, motion and final checks

**Files:**
- Modify: strings in the files above. These are friendlier headings and buttons in plain English and warm, simple Arabic, for example «خطوتك الجاية» / "Your next step", «بوصلتك» / "Your compass", «شوف» for "See".
- Modify: `frontend/e2e/app.spec.ts`. Extend the Arabic test and the axe loop at line 334 with `/compass?have=SQL` and `/` in Arabic.
- Modify: `DESIGN.md` (components `compass-dial`, `pay-band`, `key-points`), `docs/DASHBOARD_FEATURES.md` (Compass section), `docs/METRICS.md` (Global Skill Match scope and recency; pay location rules).

- [ ] **Step 1: Write the failing e2e test** `Arabic Compass mirrors and honours reduced motion`. Use `page.emulateMedia({ reducedMotion: "reduce" })`, switch to Arabic, open `/compass`, and expect `dir="rtl"`, the meter `aria-label` «التوافق العالمي للمهارات», and the needle's computed `transition-duration` of `0s`.
- [ ] **Step 2:** Run it. Expected: FAIL until the strings and reduced-motion handling are complete.
- [ ] **Step 3:** Finish the copy and docs.
- [ ] **Step 4: Full verification:**
  - `pytest -q`: 141+ passed
  - `npx tsc --noEmit -p frontend`: clean
  - `npx vitest run`: all pass
  - `npx playwright test`: all pass, including axe
  - `npm --prefix frontend run build`: succeeds
- [ ] **Step 5: Browser check** at 1280×720 in four combinations: English light, English dark, Arabic light, Arabic dark. Walk the journey Home → Compass → Roadmap → Salary, and send the user screenshots of each step.
- [ ] **Step 6:** Run `graphify update .`, then commit: `git add -A && git commit -m "Friendlier copy, Arabic and docs for the Compass journey"`.
- [ ] **Step 7: Stop.** Report to the user. Do not merge, push to `main` or deploy until the user approves.

## Out of scope (from the spec)

- Accounts and CV upload
- Converting pay to EGP
- New endpoints
- A Local Skill Match in the UI (only the scope seam is built)
- Redesigning Market, Jobs, Compare, Employers, Trends, Quality, Builder or Insights (they get only the type and contrast changes)
- A demo mode
