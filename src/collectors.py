"""Collect fresh tech job postings from official public job APIs.

    python src/collectors.py                     # every source that needs no key
    python src/collectors.py --only remotive,greenhouse
    JOOBLE_API_KEY=... python src/collectors.py  # also the keyed Jooble API

Only documented, public APIs are used: job-board APIs that publish their
postings for re-use (Remotive, Arbeitnow, Himalayas, Jobicy, Remote OK) and the
public job-board endpoints that applicant-tracking systems expose for an
employer's own careers page (Greenhouse, Lever, Ashby, SmartRecruiters; the
undocumented Workable widget only on request). No page is scraped and no site
whose terms forbid automated access (Wuzzuf, Bayt, LinkedIn, Indeed,
Naukrigulf) is contacted. Run it at most once a day (Remotive allows 4 calls a day). See docs/DATA_SOURCES.md for each source's terms and the
attribution it asks for.

Each run writes one CSV per source to data/raw/fresh/<YYYY-MM-DD>/<source>.csv
in the same 16-column layout the team's earlier API collection used, plus
`work_mode` and `collected_at`. loaders.load_fresh() reads every run and keeps
the latest copy of each posting; the pipeline then cleans, de-duplicates
(against all other sources too) and records every board a posting was on.

Raw files stay in data/raw/ (git-ignored, never redistributed: NFR-08).
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import logging
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Callable, Iterable

import pandas as pd

import clean_utils as cu
import skill_taxonomy as tax

ROOT = Path(__file__).resolve().parents[1]
FRESH = ROOT / "data" / "raw" / "fresh"
log = logging.getLogger("collect")

RAW_COLUMNS = ["id", "title", "company", "category", "location_raw", "city", "state_region", "country",
               "salary", "job_type", "skills", "description", "source", "updated", "link", "search_keyword",
               "work_mode", "collected_at"]
# A generic client name: no personal contact details are sent to the APIs.
USER_AGENT = "Bosla-job-market-research/1.0 (aggregate statistics only)"
PAUSE_SECONDS = 1.0          # between two requests to the same API
MAX_PAGES = 40               # safety stop for paginated APIs

# Employers whose careers pages are published through an applicant-tracking
# system's public job-board API. Chosen because they hire tech staff in Egypt
# and the Arab region; each was checked to return postings (2026-11-14). Add an
# employer by its board name (the part after the ATS host in its careers URL).
ATS_BOARDS = {
    "greenhouse": ["careem", "tamara"],
    "lever": ["toptal"],
    "ashby": ["thndr", "andela"],
    "workable": ["robusta", "lucidya", "salla", "foodics"],
    "smartrecruiters": ["deliveryhero", "yassir"],
}
# ISO 3166 alpha-2 codes some APIs return instead of a country name.
ISO2 = {"eg": "Egypt", "sa": "Saudi Arabia", "ae": "United Arab Emirates", "kw": "Kuwait", "qa": "Qatar",
        "bh": "Bahrain", "om": "Oman", "jo": "Jordan", "lb": "Lebanon", "ma": "Morocco", "tn": "Tunisia",
        "dz": "Algeria", "iq": "Iraq", "ps": "Palestine", "sd": "Sudan", "ly": "Libya", "ye": "Yemen",
        "sy": "Syria", "de": "Germany", "gb": "United Kingdom", "us": "United States", "fr": "France",
        "nl": "Netherlands", "es": "Spain", "it": "Italy", "pl": "Poland", "tr": "Turkey", "in": "India",
        "pk": "Pakistan", "sg": "Singapore", "ca": "Canada", "au": "Australia", "at": "Austria",
        "se": "Sweden", "pt": "Portugal", "gr": "Greece", "cy": "Cyprus", "hu": "Hungary", "ro": "Romania",
        "cz": "Czech Republic", "ar": "Argentina", "br": "Brazil", "mx": "Mexico", "kr": "South Korea",
        "jp": "Japan", "tw": "Taiwan", "hk": "Hong Kong", "th": "Thailand", "my": "Malaysia",
        "ph": "Philippines", "bd": "Bangladesh", "cl": "Chile", "co": "Colombia", "pe": "Peru",
        "uy": "Uruguay", "la": "Laos", "ua": "Ukraine", "bg": "Bulgaria", "sv": "El Salvador", "kh": "Cambodia",
        "mm": "Myanmar", "pa": "Panama", "cr": "Costa Rica", "gt": "Guatemala", "hn": "Honduras",
        "ni": "Nicaragua", "do": "Dominican Republic", "ec": "Ecuador", "bo": "Bolivia", "py": "Paraguay",
        "ve": "Venezuela", "rs": "Serbia", "ba": "Bosnia and Herzegovina", "me": "Montenegro",
        "mk": "North Macedonia", "al": "Albania", "hr": "Croatia", "si": "Slovenia", "sk": "Slovakia",
        "fi": "Finland", "no": "Norway", "dk": "Denmark", "ch": "Switzerland", "be": "Belgium", "ie": "Ireland",
        "ng": "Nigeria", "ke": "Kenya", "za": "South Africa", "gh": "Ghana", "cn": "China", "vn": "Vietnam",
        "id": "Indonesia", "nz": "New Zealand", "il": "Israel", "ir": "Iran", "lk": "Sri Lanka", "np": "Nepal"}
JOOBLE_KEYWORDS = ["software engineer", "data analyst", "data engineer", "data scientist", "devops engineer",
                   "cyber security", "frontend developer", "backend developer", "mobile developer", "qa engineer"]


# ---------------------------------------------------------------------------
def fetch_json(url: str, data: dict | None = None) -> object:
    """GET (or POST JSON) with a timeout and two retries on network errors."""
    body = json.dumps(data).encode() if data is not None else None
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if body:
        headers["Content-Type"] = "application/json"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, data=body, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (404, 401, 403):
                raise
            err = e
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            err = e
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"{url}: {err}")


def plain_text(value) -> str | None:
    """HTML description -> plain text (tags removed, entities decoded)."""
    if not value:
        return None
    text = html.unescape(html.unescape(str(value)))   # Greenhouse double-escapes its HTML
    text = re.sub(r"<(br|/p|/li|/h\d)[^>]*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n", text).strip() or None


def epoch(value, ms: bool = False) -> str | None:
    if value in (None, ""):
        return None
    return dt.datetime.fromtimestamp(int(value) / (1000 if ms else 1), dt.timezone.utc).date().isoformat()


def salary_text(lo, hi, currency, period="year") -> str | None:
    if not lo and not hi:
        return None
    nums = "-".join(f"{float(v):.0f}" for v in (lo, hi) if v)
    return f"{currency or ''} {nums} per {period}".strip()


def remote_scope(text) -> str:
    """Remote boards give who may apply ("Canada, USA", "EMEA", 50 countries), not
    where the job is. A single place is kept as the location so the pipeline can
    recognize a country name in it; a list or region becomes plain "Remote"."""
    text = str(text or "").strip()
    return text if text and not re.search(r"[,+;/]| and ", text) else "Remote"


def row(source: str, **kw) -> dict:
    out = {c: kw.get(c) for c in RAW_COLUMNS}
    out["source"] = source
    return out


# ---------------------------------------------------------------------------
# Job-board APIs (remote and international postings)
# ---------------------------------------------------------------------------
def remotive() -> Iterable[dict]:
    """https://github.com/remotive-io/remote-jobs-api - public feed, delayed 24 h.
    Terms: at most 4 requests a day; link back and name Remotive as the source."""
    data = fetch_json("https://remotive.com/api/remote-jobs")
    for j in data.get("jobs", []):
        yield row("remotive", id=j.get("id"), title=j.get("title"), company=j.get("company_name"),
                  category=j.get("category"), location_raw=remote_scope(j.get("candidate_required_location")),
                  salary=j.get("salary") or None,
                  job_type=j.get("job_type"), description=plain_text(j.get("description")),
                  skills=", ".join(j.get("tags") or []), updated=j.get("publication_date"),
                  link=j.get("url"), work_mode="Remote")


def arbeitnow() -> Iterable[dict]:
    """https://www.arbeitnow.com/blog/job-board-api - paginated, mostly Germany/Europe and remote."""
    url = "https://www.arbeitnow.com/api/job-board-api"
    for _ in range(MAX_PAGES):
        data = fetch_json(url)
        for j in data.get("data", []):
            yield row("arbeitnow", id=j.get("slug"), title=j.get("title"), company=j.get("company_name"),
                      location_raw=j.get("location"), job_type=", ".join(j.get("job_types") or []),
                      description=plain_text(j.get("description")), skills=", ".join(j.get("tags") or []),
                      updated=epoch(j.get("created_at")), link=j.get("url"),
                      work_mode="Remote" if j.get("remote") else None)
        url = (data.get("links") or {}).get("next")
        if not url:
            break
        time.sleep(PAUSE_SECONDS)


def himalayas() -> Iterable[dict]:
    """https://himalayas.app/api - remote jobs, 20 per page. Terms: show a visible link to
    the job on Himalayas (the `guid` page, used as the link here) and drop expired jobs."""
    for page in range(MAX_PAGES):
        data = fetch_json(f"https://himalayas.app/jobs/api?limit=20&offset={page * 20}")
        jobs = data.get("jobs", [])
        for j in jobs:
            yield row("himalayas", id=j.get("guid"), title=j.get("title"), company=j.get("companyName"),
                      category=", ".join(j.get("categories") or []),
                      location_raw=remote_scope(", ".join(j.get("locationRestrictions") or [])),
                      salary=salary_text(j.get("minSalary"), j.get("maxSalary"), j.get("currency")),
                      job_type=j.get("employmentType"), description=plain_text(j.get("description")),
                      skills=", ".join(j.get("categories") or []), updated=epoch(j.get("pubDate")),
                      link=j.get("guid"), work_mode="Remote")
        if len(jobs) < 20:
            break
        time.sleep(PAUSE_SECONDS)


def jobicy() -> Iterable[dict]:
    """https://jobicy.com/jobs-rss-feed - latest remote jobs (max 100 per call). Terms: credit
    Jobicy, link to the Jobicy job page, mark closed roles unavailable; sync at most hourly."""
    for industry in ("dev", "data-science", "engineering", "admin"):   # admin = sysadmin / IT
        data = fetch_json(f"https://jobicy.com/api/v2/remote-jobs?count=100&industry={industry}")
        for j in data.get("jobs", []):
            yield row("jobicy", id=j.get("id"), title=plain_text(j.get("jobTitle")), company=j.get("companyName"),
                      category=", ".join(j.get("jobIndustry") or []), location_raw=remote_scope(j.get("jobGeo")),
                      salary=salary_text(j.get("annualSalaryMin"), j.get("annualSalaryMax"), j.get("salaryCurrency")),
                      job_type=", ".join(j.get("jobType") or []), description=plain_text(j.get("jobDescription")),
                      updated=j.get("pubDate"), link=j.get("url"), search_keyword=industry, work_mode="Remote")
        time.sleep(PAUSE_SECONDS)


def remoteok() -> Iterable[dict]:
    """https://remoteok.com/api - the first element is the API's legal notice. Terms: link
    back to Remote OK (a followed link) and name it as the source."""
    data = fetch_json("https://remoteok.com/api")
    for j in data[1:] if isinstance(data, list) else []:
        yield row("remoteok", id=j.get("id"), title=j.get("position"), company=j.get("company"),
                  location_raw=remote_scope(j.get("location")),
                  salary=salary_text(j.get("salary_min"), j.get("salary_max"), "USD"),
                  description=plain_text(j.get("description")), skills=", ".join(j.get("tags") or []),
                  updated=j.get("date"), link=j.get("url"), work_mode="Remote")


def jooble() -> Iterable[dict]:
    """https://jooblehelpcenter.freshdesk.com (REST API docs) - needs a free key, and each
    key belongs to ONE country site (e.g. eg.jooble.org/api/about for Egypt) with 100
    requests a day. Set JOOBLE_API_KEY and JOOBLE_LOCATION (default Egypt)."""
    key = os.environ.get("JOOBLE_API_KEY")
    if not key:
        log.info("jooble: skipped (set JOOBLE_API_KEY to enable)")
        return
    location = os.environ.get("JOOBLE_LOCATION", "Egypt")
    for keyword in JOOBLE_KEYWORDS:
        data = fetch_json(f"https://jooble.org/api/{urllib.parse.quote(key)}",
                          {"keywords": keyword, "location": location, "page": "1"})
        for j in data.get("jobs", []):
            yield row("jooble", id=j.get("id"), title=j.get("title"), company=j.get("company"),
                      location_raw=j.get("location"), country=location, salary=j.get("salary") or None,
                      job_type=j.get("type"), description=plain_text(j.get("snippet")),
                      updated=j.get("updated"), link=j.get("link"),
                      search_keyword=f"{keyword} | {location}", category=j.get("source"))
        time.sleep(PAUSE_SECONDS)


# ---------------------------------------------------------------------------
# Applicant-tracking systems: employers' own careers pages
# ---------------------------------------------------------------------------
def greenhouse() -> Iterable[dict]:
    """https://docs.greenhouse.io/job-board.html - public Job Board API (no auth for GET)."""
    for board in ATS_BOARDS["greenhouse"]:
        data = fetch_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true")
        for j in data.get("jobs", []):
            loc = (j.get("location") or {}).get("name")
            yield row(f"greenhouse:{board}", id=j.get("id"), title=j.get("title"),
                      company=j.get("company_name") or board.title(),
                      category=", ".join(d.get("name", "") for d in j.get("departments") or []),
                      location_raw=loc, description=plain_text(j.get("content")), updated=j.get("updated_at"),
                      link=j.get("absolute_url"), search_keyword=board)
        time.sleep(PAUSE_SECONDS)


def lever() -> Iterable[dict]:
    """https://github.com/lever/postings-api - public Postings API."""
    for site in ATS_BOARDS["lever"]:
        data = fetch_json(f"https://api.lever.co/v0/postings/{site}?mode=json")
        for j in data if isinstance(data, list) else []:
            cat = j.get("categories") or {}
            mode = {"remote": "Remote", "hybrid": "Hybrid", "on-site": "On-site"}.get(j.get("workplaceType"))
            yield row(f"lever:{site}", id=j.get("id"), title=j.get("text"), company=site.title(),
                      category=cat.get("team"), location_raw=cat.get("location"),
                      country=ISO2.get(str(j.get("country") or "").lower()), job_type=cat.get("commitment"),
                      description=j.get("descriptionPlain"), updated=epoch(j.get("createdAt"), ms=True),
                      link=j.get("hostedUrl"), search_keyword=site, work_mode=mode)
        time.sleep(PAUSE_SECONDS)


def ashby() -> Iterable[dict]:
    """https://developers.ashbyhq.com/docs/public-job-posting-api - public job board API."""
    for board in ATS_BOARDS["ashby"]:
        data = fetch_json(f"https://api.ashbyhq.com/posting-api/job-board/{board}")
        for j in data.get("jobs", []):
            addr = ((j.get("address") or {}).get("postalAddress") or {})
            yield row(f"ashby:{board}", id=j.get("id"), title=j.get("title"), company=board.title(),
                      category=j.get("department"), location_raw=j.get("location"),
                      city=addr.get("addressLocality"), country=addr.get("addressCountry"),
                      job_type=j.get("employmentType"), description=j.get("descriptionPlain"),
                      updated=j.get("publishedAt"), link=j.get("jobUrl"), search_keyword=board,
                      work_mode="Remote" if j.get("isRemote") else None)
        time.sleep(PAUSE_SECONDS)


def workable() -> Iterable[dict]:
    """apply.workable.com widget endpoint that Workable careers pages load. NOT formally
    documented and its terms are unknown, so it is opt-in: --only workable."""
    for account in ATS_BOARDS["workable"]:
        data = fetch_json(f"https://apply.workable.com/api/v1/widget/accounts/{account}?details=true")
        for j in data.get("jobs", []):
            loc = ", ".join(x for x in (j.get("city"), j.get("state"), j.get("country")) if x)
            yield row(f"workable:{account}", id=j.get("shortcode"), title=j.get("title"),
                      company=data.get("name") or account.title(), category=j.get("department"),
                      location_raw=loc, city=j.get("city"), country=j.get("country"),
                      job_type=j.get("employment_type"), description=plain_text(j.get("description")),
                      updated=j.get("published_on") or j.get("created_at"), link=j.get("url"),
                      search_keyword=account, work_mode="Remote" if j.get("telecommuting") else None)
        time.sleep(PAUSE_SECONDS)


def smartrecruiters() -> Iterable[dict]:
    """https://developers.smartrecruiters.com/reference/v1listpostings - public Posting API (no descriptions)."""
    for company in ATS_BOARDS["smartrecruiters"]:
        for page in range(MAX_PAGES):
            data = fetch_json(f"https://api.smartrecruiters.com/v1/companies/{company}/postings"
                              f"?limit=100&offset={page * 100}")
            for j in data.get("content", []):
                loc = j.get("location") or {}
                country = ISO2.get(str(loc.get("country") or "").lower())
                yield row(f"smartrecruiters:{company}", id=j.get("id"), title=j.get("name"),
                          company=(j.get("company") or {}).get("name") or company,
                          category=(j.get("function") or {}).get("label"),
                          location_raw=", ".join(x for x in (loc.get("city"), country) if x),
                          city=loc.get("city"), country=country,
                          job_type=(j.get("typeOfEmployment") or {}).get("label"),
                          updated=j.get("releasedDate"), search_keyword=company,
                          link=f"https://jobs.smartrecruiters.com/{company}/{j.get('id')}",
                          work_mode="Remote" if loc.get("remote") else None)
            if (page + 1) * 100 >= data.get("totalFound", 0):
                break
            time.sleep(PAUSE_SECONDS)


# Run by default. Workable's widget endpoint is undocumented, so it only runs
# when asked for by name; Jooble runs only when its key is set.
DEFAULT_SOURCES = ["remotive", "arbeitnow", "himalayas", "jobicy", "remoteok", "jooble", "greenhouse", "lever",
                   "ashby", "smartrecruiters"]
SOURCES: dict[str, Callable[[], Iterable[dict]]] = {
    "remotive": remotive, "arbeitnow": arbeitnow, "himalayas": himalayas, "jobicy": jobicy,
    "remoteok": remoteok, "jooble": jooble, "greenhouse": greenhouse, "lever": lever, "ashby": ashby,
    "workable": workable, "smartrecruiters": smartrecruiters,
}


# ---------------------------------------------------------------------------
def tech_only(df: pd.DataFrame) -> pd.DataFrame:
    """Keep postings whose title is a tech role (the pipeline's own rule), so
    general boards and employers' sales or finance jobs are not stored."""
    role = cu.categorize_role(cu.clean_title(df["title"]))
    return df[~role.isin(["Non-tech", "Other / Unclassified"])]


def add_skills(df: pd.DataFrame) -> pd.DataFrame:
    """Skills written in the posting: the API's tags that are known skills plus
    skills found in the title and description (skill_taxonomy.extract_skills)."""
    text = df["title"].fillna("") + "\n" + df["skills"].fillna("") + "\n" + df["description"].fillna("")
    df["skills"] = text.map(lambda t: ", ".join(tax.extract_skills(t)) or None)
    return df


def collect(names: list[str], out_root: Path = FRESH, today: dt.date | None = None) -> dict[str, int]:
    day = (today or dt.date.today()).isoformat()
    folder = out_root / day
    folder.mkdir(parents=True, exist_ok=True)
    counts = {}
    for name in names:
        t = time.perf_counter()
        try:
            rows = list(SOURCES[name]())
        except Exception as e:  # one failing API must not stop the others
            log.warning("%-16s FAILED: %s", name, e)
            counts[name] = -1
            continue
        if not rows:
            counts[name] = 0
            continue
        df = pd.DataFrame(rows, columns=RAW_COLUMNS).assign(collected_at=day)
        fetched = len(df)
        df = add_skills(tech_only(df.dropna(subset=["title"]).drop_duplicates(["source", "id"])))
        df.to_csv(folder / f"{name}.csv", index=False, encoding="utf-8-sig")
        counts[name] = len(df)
        log.info("%-16s %5d fetched, %5d tech postings kept  (%.1fs)", name, fetched, len(df),
                 time.perf_counter() - t)
    return counts


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s", datefmt="%H:%M:%S")
    parser = argparse.ArgumentParser(description="Collect fresh postings from public job APIs.")
    parser.add_argument("--only", help="comma-separated sources (default: all except workable): " + ", ".join(SOURCES))
    parser.add_argument("--out", type=Path, default=FRESH)
    args = parser.parse_args()
    names = [n.strip() for n in args.only.split(",")] if args.only else DEFAULT_SOURCES
    unknown = [n for n in names if n not in SOURCES]
    if unknown:
        parser.error(f"unknown source(s): {unknown}")
    print(json.dumps(collect(names, args.out), indent=2))


if __name__ == "__main__":
    main()
