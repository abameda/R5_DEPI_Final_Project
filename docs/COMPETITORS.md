# Competitors and next features

Research date: 14 Nov 2026. Claims link to their source. Anything not confirmed is marked
*unverified*. The source research and API terms are in [DATA_SOURCES.md](DATA_SOURCES.md).

## What job seekers in Egypt and the Gulf use today

| Product | Market intelligence it offers | Gap for an Egyptian or Arab tech job seeker |
|---|---|---|
| [Wuzzuf](https://wuzzuf.net/about-us) | Matching, alerts, applying | No salary, skill-trend or market views; content may not be reused |
| [Bayt](https://www.bayt.com/en/egypt/salaries/jobtitle/engineer/) | Self-reported salary calculator, older MENA salary surveys | Broad titles (no software-engineer split), opaque method, surveys mostly 2011–15 |
| Forasna | Job ads only | No insights |
| LinkedIn | Salary insights; ["Jobs on the Rise" for the UAE and Saudi Arabia](https://economymiddleeast.com/news/15-fastest-growing-jobs-in-uae-and-saudi-arabia-in-2025-linkedin) | No Egypt edition found; insights tied to Premium and to LinkedIn's own sample, with no sample sizes |
| Glassdoor | Salaries and reviews | Thin Egyptian samples: one Cairo estimate is ["Low Confidence"](https://www.glassdoor.com.hk/Salaries/cairo-egypt-advertising-salary-SRCH_IL.0,11_IM1175_KO12,23.htm), from one submission |
| [Naukrigulf Hiring Index](https://www.naukrigulf.com/career-tips/uae-hiring-index-april-to-may) | Monthly sector hiring for the UAE, Qatar and Oman | Gulf only, sector-level, no skills, no Egypt |
| [GulfTalent](https://www.gulftalent.com/repository/int/Employment_and_Salary_Trends_in_the_Gulf_2010_2011.pdf) | Annual Gulf salary report | Survey-based, newest found is 2016 (*later editions unverified*) |
| [Indeed](https://eg.indeed.com/career/software-engineer/salaries) | Salary pages | The Egyptian software-engineer figure rests on about 2 reports |
| [roadmap.sh](https://roadmap.sh/) | Learning roadmaps by role and skill | No demand, salary or regional data |
| [levels.fyi](https://www.levels.fyi/t/software-engineer/locations/egypt) | Egypt pay from 414 data points | Self-reported, skewed to multinationals, no demand or skills |
| [Lightcast](https://lightcast.io/resources/whats-new/global-data) | Enterprise labour-market analytics, Middle East coverage | Enterprise pricing, not for job seekers |
| [Payscale](https://www.payscale.com/research/EG/Job=Software_Engineer/Salary) | Egypt pay by experience and skill | Base pay only, opaque method, no link to demand |

**Where Bosla is already different:** every figure states its sample size and source; skills
written in postings are kept apart from team-added ones; advertised pay is kept apart from
benchmarks; Egypt, the Gulf, international and remote markets sit in one view; and a career
plan is tied to real postings.

## Shipped in this round

1. **Where to search** (Career planner): the job boards that listed a role's postings, the
   share each reached, postings found only there, and the best combination of up to three
   boards. It flags small samples and the boards Bosla reads directly, which are over-represented.
2. **Employer report card** (Employers): how often an employer's postings state pay,
   skills, seniority and work mode, each against the market with a 95% interval. A
   "States pay" column and sort are in the directory.
3. **Also posted on** (job detail): every board a de-duplicated posting was found on, with
   each listing's date and link.
4. **Fresh collection** (`src/collectors.py`): official public APIs only, re-runnable daily.

## Proposed next features (need approval)

Ranked by impact for the primary user and how much of the data already exists. All stay
within PRODUCT.md: no CV matching, no applying, no claims about the whole market, aggregates
only.

| # | Feature | Why no competitor has it | What it needs |
|---|---|---|---|
| 1 | **"Open to applicants in Egypt"** filter for remote jobs | Global boards and Wuzzuf both miss it; Himalayas alone reports about 1,600 remote jobs open to Egypt (*count from one live query*) | Keep each remote posting's eligibility list (it is currently reduced to "Remote") as a new `eligible_countries` field; add Himalayas' search endpoint (`country=Egypt`) |
| 2 | **Posting lifespan and ghost-job signals** | Boards never show how long a role stays open or how often it is reposted | Daily collection runs; record `first_seen` / `last_seen` per posting |
| 3 | **Pay-disclosure index** by role and city, with advertised pay in EGP and USD | Pay transparency is the main gap in every Egyptian salary site | Mostly built: reuse the report card's pay rule per role and country |
| 4 | **Cairo vs Riyadh vs Dubai vs Remote** for one role, in one click | No single product covers Egypt and the Gulf together | Compare-page preset; needs more Arab postings to be reliable (see the data note below) |
| 5 | **Coverage map**: where Bosla's data is thin (country × role × source × age) | Competitors hide sample size | Mostly a view over existing tables |
| 6 | **Employer hiring activity over time** from their public careers pages | Glassdoor and Wuzzuf show listings and reviews, not trends | Repeated runs of the careers-page collector, more employers in `ATS_BOARDS` |

## The data gap to fix before anything else

The free APIs Bosla can use legally are mostly global or remote boards. After the first
collection run, **9 of the 2,600 fresh postings are in Egypt and 28 are in Arab markets**
(720 are remote).
The 2023 archive still makes up 97% of the sample. The legal ways to add Egyptian and Gulf
postings, in order of effect:

1. **A Jooble API key for Egypt** (free, one key per country site, 100 requests a day).
   It is already wired in: set `JOOBLE_API_KEY`.
2. **More MENA employers' public careers pages** in `ATS_BOARDS`. Each one is a single name.
3. **The Workable careers-page endpoint** (Foodics, Salla, Lucidya, Robusta), if you
   accept that it is undocumented.
4. **Partnerships**: a data agreement with a local board. Wuzzuf, Bayt and Forasna have no
   API and do not allow scraping.
