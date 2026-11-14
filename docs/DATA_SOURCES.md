# Fresh data sources

Bosla's original data is mostly the 2023 Kaggle archive. `src/collectors.py` adds fresh
postings from **official, public job APIs**. It never scrapes a website. Terms were checked
on 14 Nov 2026; check them again before any commercial use.

```bash
python src/collectors.py                         # all default sources, about 4 minutes
python src/collectors.py --only greenhouse,lever
python src/pipeline.py && python src/build_analytics.py
```

Run it **at most once a day**: Remotive allows 4 calls a day. Each run writes
`data/raw/fresh/<date>/<source>.csv`. That folder is git-ignored and never redistributed (NFR-08).

The loader keeps the newest copy of each posting. A posting that has dropped out of its
source's latest run keeps its place in the statistics but loses its link, so Bosla never
shows a closed job as open. Himalayas and Jobicy ask for exactly this.

## Sources used by default (no key)

| Source | What it gives | Coverage | Terms Bosla follows |
|---|---|---|---|
| [Remotive](https://github.com/remotive-io/remote-jobs-api) | Public feed, delayed 24 h (about 16 jobs on 14 Nov) | Global remote | At most 4 calls a day; link back and name Remotive as the source; never pass the jobs on to Google Jobs, LinkedIn Jobs, Jooble or Neuvoo |
| [Arbeitnow](https://www.arbeitnow.com/blog/job-board-api) | Paginated board, 300 per page, no salary | Germany, Europe, remote | Linking back is appreciated; arbeitnow.com terms of service apply |
| [Himalayas](https://himalayas.app/api) | Remote jobs with salary, seniority and country restrictions | Global remote, can filter by eligible country | The link shown is the job's Himalayas page (`guid`); `applicationLink` is not changed; expired jobs lose their link; no passing on to other boards or Google Jobs, including JobPosting markup |
| [Jobicy](https://jobicy.com/jobs-rss-feed) | Remote jobs with salary | Global remote (has a UAE value, but none for Egypt or Saudi Arabia) | Credit Jobicy and link to the Jobicy job page; mark closed roles unavailable; sync at most hourly |
| [Remote OK](https://remoteok.com/api) | Remote jobs with tags and salary | Global remote | Link back with a **followed** link (Bosla drops `nofollow` for remoteok.com only) and name Remote OK; never use its logo |
| [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html) | Employers' public job boards; no auth needed for GET | Depends on the employer: Careem, Tamara (Cairo, Riyadh, Dubai) | Storage and aggregation terms are not stated |
| [Lever Postings API](https://github.com/lever/postings-api) | Employers' public postings | Depends on the employer: Toptal | No licence stated; the docs expect third parties to read the postings |
| [Ashby public job posting API](https://developers.ashbyhq.com/docs/public-job-posting-api) | Employers' public job boards | Depends on the employer: Thndr (Cairo), Andela | Not stated |
| [SmartRecruiters Posting API](https://developers.smartrecruiters.com/reference/v1listpostings) | Employers' public postings, no descriptions | Depends on the employer: Delivery Hero / talabat (Gulf, Egypt), Yassir | Not stated |

The employers are listed in `ATS_BOARDS` in `src/collectors.py`. Each was checked to return
postings on 14 Nov 2026. To add one, use its board name: the part after the ATS host in
its careers URL.

## Off by default

| Source | Why | How to enable |
|---|---|---|
| Jooble REST API | Needs a free key, one key per country site, 100 requests a day. It is the main legal route to Egyptian and Gulf aggregator postings. No published terms on storing data. | Request a key at `eg.jooble.org/api/about`, then set `JOOBLE_API_KEY` (and `JOOBLE_LOCATION`, default Egypt) |
| Workable widget (`apply.workable.com/api/v1/widget/accounts/<name>`) | Not formally documented and its terms are unknown, though it is the endpoint Workable careers pages load. It has Foodics, Salla, Lucidya and Robusta (Egypt, Saudi Arabia, UAE). | `python src/collectors.py --only workable`, after you decide its terms are acceptable |

## Checked and not used

| Source | Reason |
|---|---|
| Adzuna | Covers no Egypt or Gulf country; commercial use needs a licence after a 14-day trial |
| Careerjet | Needs an approved publisher key; whether the API serves the Arab locales is unverified |
| The Muse | The public API looks discontinued (404 / 403) |
| Wuzzuf, Forasna | No public API. Wuzzuf's terms allow personal, non-commercial use only and forbid redistribution |
| Bayt, Naukrigulf, LinkedIn, Indeed | No public job-search API, and their terms explicitly forbid scraping or automated access |

## Rules for the dashboard

* Never emit `JobPosting` structured data for third-party jobs (Remotive and Himalayas
  forbid passing their jobs to Google Jobs).
* Exports stay aggregate-only (NFR-08). Postings are shown one page at a time, each with
  its original link and source.
* Every figure that uses this collection says it describes **Bosla's collected sample**,
  not the whole labour market.
