# Compass journey: design

Date: 2026-11-14 · Status: builder check done, user's decisions recorded; awaiting final approval

## Why

Bosla will be shown live to DEPI evaluators and an audience, by screen sharing in an online
meeting. The presenter clicks through the real working site. The length of the slot is not
confirmed, so the demo must work as a 3-minute run or a 15-minute one. The user asked for a
more creative, friendlier design that beats competing platforms. They also want a genuinely
useful, production-quality product, not a presentation-only prototype.

A competitor audit (Wuzzuf, Bayt, Forasna, LinkedIn, Glassdoor, Levels.fyi, Indeed Hiring Lab,
Lightcast, roadmap.sh, Teal, Coursera, Grow with Google, The Pudding, Our World in Data) found
these openings:

- Nobody gives a free personal skill gap for each tech role without sign-in. LinkedIn puts it
  behind Premium, and Teal charges about $29 a month.
- Pay is shown badly: Levels.fyi converts US salaries into EGP, Wuzzuf shows none, and Bayt's
  figures contradict each other.
- Nobody serves fresh graduates with something to act on.
- Others hide data behind sign-up walls, blurred entries, demo forms and upsells.
- Nobody does Arabic and English well in one product.

The user picked direction **A, "Compass journey"**. Bosla means compass. The product becomes
one guided journey: pick a role, tick your skills, choose where you'd work. That opens your
personal Compass, and the existing analysis pages become the evidence behind it.

## Goals

Numbers inside quoted example copy below are placeholders that show the wording, not real figures.

1. **Start on Home: three steps.** Role → skills → where you'd work, answered inline on Home.
   This replaces the current "Tell us where you are" block. Each step is visible and completes
   in place, with no wizard modal. The hero keeps job search and gains a live count-up of
   postings, countries and skills from `/api/overview`.
2. **The Compass page** replaces "My skills & plan" (`Career.tsx`):
   - **Match dial, labelled "Global Skill Match":** a compass-style gauge whose needle points at
     the existing match score (`alignment.score` from `/api/career/gap`). The number and needle
     animate when a skill is added or removed. The answer sentence stays beside it ("You have 4
     of the 15 skills Data Analysis & BI postings ask for most worldwide, about 38% of the
     demand"). Directly under the dial, always visible in Simple mode too:
     - the sample size: "Based on 41,210 Data Analysis & BI postings worldwide that list skills"
       (`denominator`)
     - data freshness: the posting date range of the sample, from the existing meta first and
       last posted dates, with the 2023 archive / 2024–26 collection split noted in Advanced
     - a scope note: "Skills asked for across all markets. Not specific to Egypt or your chosen
       location."
   - **Gap chips:** the top priorities as chips. Each has "I have this" and a link into that
     skill on the Roadmap page.
   - **Where your pay lands:** advertised pay for the role in the chosen market, drawn as a
     p10–p90 band with the p25–p75 box and a median marker. It always shows the sample size
     and the existing `confidence` label, and says plainly when the market's sample is too
     small (Egypt has 130 advertised-salary postings in total). Data comes from the existing
     `/api/salary/summary`, filtered by role and market.
   - **Jobs that fit you best:** kept from the current page.
   - **Where else you fit:** kept from the current page.
   - **Share my compass:** copies a link with `?target=&have=` (already supported) plus the
     market. It is also how the presenter sets up the demo state in one click.
3. **Where you'd work:** Egypt, Arab countries, Remote, International, or Anywhere. Egypt maps
   to the `country` filter, and the others to the existing `market` filter. The choice is
   saved in the profile next to the role and skills, and is used by the Compass and Home.
4. **Evidence pages get "answer first".** Skills, Salary and Geography each open with a title
   that states the finding ("Python is asked for in 6 of 10 data postings") and up to three key
   points computed from data the page already loads. Each key point shows its sample size.
5. **Readable over screen share.** Compression and small viewer windows blur fine detail:
   - body text 15px, labels and chart axes at least 13px
   - the lowest-contrast text token raised to at least 5.5:1 on its background
   - hairlines that carry meaning use `line-strong`
   - no thin gradients, and no text over images
   - checked at 1280×720, which is a typical shared window
6. **Motion that survives a video call.** Each user action gets at most one clear animation:
   the needle swing, a number count-up, or a chip moving from the gap list to "you have it".
   Each runs 400–700 ms with no looping or ambient motion, and is turned off under
   `prefers-reduced-motion`.
7. **Friendlier copy.** Plain second-person English, and warm, simple Modern Standard Arabic,
   for example "خطوتك الجاية" in place of stiff formal phrasing in headings and buttons. Every
   number keeps its sample size and provenance.
8. **Demo chapters are real pages,** each with a stable URL: Home start → Compass → Roadmap →
   evidence (Skills / Salary / Geography) → switch to Arabic. A short demo uses the first two,
   and a long one uses all of them. There is no separate demo mode.

## Non-goals

- Accounts, CV upload, applying to jobs.
- Converting pay to EGP. The dataset stores pay as USD per year, and there is no audited
  exchange-rate source in the project. Pay is shown as USD per year with a per-month figure
  beside it.
- New data, new analytics formulas or new API endpoints, unless a small read-only parameter is
  needed (for example a country filter that the salary summary does not already accept).
- Redesigning the pages not listed above (Market, Jobs, Compare, Employers, Trends, Quality,
  Builder, Insights). They inherit only the global readability changes.
- A demo-only mode, a scripted autoplay or a presenter overlay.

## Anti-goals (a failure even if it works)

- Any invented number, or any figure shown without its sample size.
- The Global Skill Match implying it describes Egypt's or any local market's requirements.
- The dial or copy implying a hiring probability. Keep the existing wording: overlap with
  postings, not odds of getting hired.
- Showing US pay as if it were Egyptian pay.
- Motion that stutters or distracts over a video call.
- Breaking Arabic right-to-left layout. The dial and charts mirror correctly.
- Breaking existing unit or Playwright tests, or shared links (`/career?target=…&have=…`).
- Copying a competitor's look closely enough to read as a clone.

## Constraints

- Stack: React 19, TypeScript, Vite, Tailwind 4, ECharts 6, lucide icons; FastAPI + DuckDB
  backend. Build on the design system in `DESIGN.md`: stone ground, deep blue for actions, teal
  for "you have it", amber for gaps, and one navy answer surface per page.
- The profile stays in `localStorage` (`lib/profile.ts`). Adding the market field must keep old
  saved profiles readable.
- Simple and Advanced modes (`lib/mode.ts`) stay. The Compass shows its core in Simple mode,
  and the methodology details in Advanced.
- WCAG 2.1 AA, keyboard operable. The dial has a text equivalent (`role="meter"` with
  `aria-valuenow`), and charts never rely on colour alone.
- Raw postings are never redistributed; only aggregates are shown or exported.

## Approaches considered

- **A. Compass journey (picked).** A guided start on Home, then a personal Compass page, with the
  existing analysis pages as evidence. It gives the most memorable demo and is the most useful
  afterwards, and it is the free skill gap that LinkedIn charges for. It is also the largest
  change, mostly Home and Career.
- **B. Data briefing.** Every page answer-first, with key points and confidence labels, and a
  visual market story on Home. Very credible to data-science evaluators with less layout change,
  but less personal and less fun live. Its best pieces (finding titles, key points, confidence
  labels) are folded into goal 4.
- **C. Polish pass.** Keep the structure; raise readability, warm up the copy, add a hero counter.
  Lowest risk, but not distinctive enough to "beat" competitors. Its pieces are in goals 1, 5
  and 7.

## Decided

- Route: the Compass lives at `/compass`. `/career` redirects there and keeps its query string,
  so old shared links still work. The nav label becomes "Your compass" / «بوصلتك».
- Pay is in USD (per year, with per month beside it). Its market follows the profile's "where
  you'd work" choice and never silently falls back to all markets.
- The match score formula is unchanged. Only its presentation changes.
- *(user's decision)* **Location scopes pay and jobs, not the skill match.** The match dial, its
  answer sentence, the gap chips and "Where else you fit" are computed from all postings for the
  role, with every location filter removed. "Where your pay lands" and "Jobs that fit you best"
  follow the profile's location. The score is always called **Global Skill Match** («التوافق
  العالمي للمهارات»), always shows its sample size and data freshness, and never implies it
  describes local requirements.
- *(user's decision)* **Ready for a future Local Skill Match.** The gap request is built in one
  place from a match scope: `global` strips location filters; `local` would keep the profile's
  location. Only `global` is used now. Every piece of match UI (dial, sentence, sample line,
  scope note) takes the scope and its label as input instead of hard-coding "global", so a local
  match can sit beside the global one later. It would only be shown when the local sample meets
  the existing reliability threshold (`min_group_postings` from the API, enforced through the
  existing `too_few_postings` status). The API needs no change: `/api/career/gap` already
  accepts location filters.
- *(Claude's call)* **One source for "where you'd work".** It is stored in the profile
  (`where: "egypt" | "arab" | "remote" | "international" | "any"`), and old profiles without it
  read as `"any"`. The Compass and Home take location from the profile only. They ignore the
  global `market` and `country` URL filters, but keep honouring the other global filters as
  they do today. The share link uses its own `where=` parameter, so it never leaks into the
  global filters.
- *(Claude's call)* **Evidence pages stay driven by their own filters.** Their finding titles
  and key points describe whatever the page's filters select. Every "see the evidence" link on
  the Compass opens the page through `drillHref` with the profile's role and location applied,
  so the story carries across without those pages reading the profile.
- *(Claude's call)* **Pay outside Egypt is labelled by where it comes from.** For Anywhere,
  International and Remote, the pay band names the leading countries in the sample ("mostly
  United States postings, 71%"). When the role's Egypt sample is below the existing minimum,
  the panel says so and offers an explicit "See Arab countries instead" button. It never
  switches silently.
- *(Claude's call)* **No language URL parameter.** The language stays a toggle in the top bar.
  Switching it live is itself the Arabic chapter of the demo.

## Left to the builder

- The exact dial geometry and drawing method (SVG is expected) and the needle easing.
- How the three Home steps lay out at each breakpoint.
- The wording of each finding title and key point, within the rules above.
- Whether the count-up hero numbers use an existing format helper or a small new one.
- Test coverage: unit tests for the score-to-angle mapping, the profile migration, and that
  the `global` match scope strips every location filter; Playwright
  for the full journey in English and Arabic; an axe check on Home and Compass.
