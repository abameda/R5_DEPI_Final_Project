"""Reusable cleaning helpers for the Job Market Intelligence project.

Every function here is *pure*: it takes a value (or a pandas Series) and
returns a cleaned value, without reading files. That makes each rule easy to
test (see tests/test_clean_utils.py) and easy to reuse in the loaders.

Rules implemented (FR = functional requirement in the project documentation):
  * FR-06  remove emails and phone numbers from text
  * FR-07  normalize Arabic text and standardize English text
  * FR-05  detect language (Arabic / English / mixed)
  * FR-08  standardize country names and job titles
  * FR-04  assign market type (Arab / International / Remote)
  * FR-10  rule-based role category (keep engineering / tech postings)
  * FR-17  parse salaries into min / max / currency / period / annual USD
"""
from __future__ import annotations

import ast
import re

import numpy as np
import pandas as pd
from ftfy import fix_text

# ---------------------------------------------------------------------------
# 1. Text normalization
# ---------------------------------------------------------------------------
# Arabic diacritics (tashkeel: fatha, damma, kasra, shadda, sukun, tanween ...)
# and the tatweel/kashida stretching character "ـ".
_AR_DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
# Letter variants -> one canonical letter. Only "safe" unifications are used
# for display text; ة -> ه is NOT applied because it changes meaning in display.
_AR_LETTERS = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي"})
# Arabic-Indic and Persian digits -> Western digits (٥ -> 5), so numbers parse.
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
# Invisible direction marks / zero-width characters that break comparisons.
_INVISIBLE = re.compile(r"[​-‏‪-‮⁦-⁩﻿]")
_ARABIC_CHAR = re.compile(r"[؀-ۿ]")
_LATIN_CHAR = re.compile(r"[A-Za-z]")


def normalize_text(value) -> str | float:
    """Fix encoding errors, normalize Arabic, and tidy whitespace.

    >>> normalize_text("  Weâ€™re   hiring\\n")
    "We're hiring"
    """
    if not isinstance(value, str):
        return np.nan
    text = value
    if not text.isascii():
        # ftfy repairs "mojibake" such as "Weâ€™re" -> "We're" (text that was
        # saved as UTF-8 but read back as Windows-1252).
        text = fix_text(text)
        # damaged leftovers ftfy cannot undo (one byte of the dash was lost)
        text = text.replace('â€"', "–").replace("â€", '"')
        text = _INVISIBLE.sub("", text)
        text = _AR_DIACRITICS.sub("", text)
        text = text.translate(_AR_LETTERS).translate(_DIGITS)
    text = re.sub(r"\s+", " ", text).strip()
    return text if text else np.nan


def normalize_series(s: pd.Series) -> pd.Series:
    """Apply normalize_text to a column (skips the work for missing values)."""
    return s.map(normalize_text, na_action="ignore")


def match_key(s: pd.Series) -> pd.Series:
    """Aggressive normalization used ONLY for matching / deduplication.

    Lowercases, removes punctuation and unifies ة/ه so that
    "Data-Engineer (Remote)" and "data engineer remote" give the same key.
    """
    return (s.fillna("").astype(str).str.lower()
            .str.replace("ة", "ه", regex=False)
            .str.replace(r"[^\w؀-ۿ]+", " ", regex=True)
            .str.replace(r"\s+", " ", regex=True).str.strip())


# ---------------------------------------------------------------------------
# 2. Personal data removal (FR-06 / NFR-05)
# ---------------------------------------------------------------------------
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
# Phone numbers: international (+20 ..., 00966 ...), Egyptian mobiles (01x...)
# and North-American style (555) 123-4567 / 555-123-4567.
PHONE_RE = re.compile(
    r"(?:(?:\+|\b00)\d{1,3}[\s.-]?(?:\(?\d{1,4}\)?[\s.-]?){2,4}\d{2,4}\b)"
    r"|(?:\b01[0125]\d{8}\b)"
    r"|(?:\(\d{3}\)\s?\d{3}[\s.-]\d{4}\b)"
    r"|(?:\b\d{3}[.-]\d{3}[.-]\d{4}\b)"
)


def remove_pii(s: pd.Series) -> pd.Series:
    """Replace emails with [email] and phone numbers with [phone]."""
    return (s.str.replace(EMAIL_RE, "[email]", regex=True)
             .str.replace(PHONE_RE, "[phone]", regex=True))


# ---------------------------------------------------------------------------
# 3. Language detection (FR-05) - simple and dependency free
# ---------------------------------------------------------------------------
def detect_language(text) -> str:
    """Return 'ar', 'en', 'mixed' or 'unknown' from the share of letters."""
    if not isinstance(text, str) or not text:
        return "unknown"
    ar = len(_ARABIC_CHAR.findall(text))
    en = len(_LATIN_CHAR.findall(text))
    if ar + en == 0:
        return "unknown"
    share_ar = ar / (ar + en)
    if share_ar >= 0.7:
        return "ar"
    if share_ar <= 0.1:
        return "en"
    return "mixed"


# ---------------------------------------------------------------------------
# 4. Countries and market type (FR-04 / FR-08)
# ---------------------------------------------------------------------------
# The 22 member states of the Arab League -> "Arab" market.
ARAB_COUNTRIES = {
    "Algeria", "Bahrain", "Comoros", "Djibouti", "Egypt", "Iraq", "Jordan",
    "Kuwait", "Lebanon", "Libya", "Mauritania", "Morocco", "Oman", "Palestine",
    "Qatar", "Saudi Arabia", "Somalia", "Sudan", "Syria", "Tunisia",
    "United Arab Emirates", "Yemen",
}
# Spelling variants seen in the raw files -> one standard English name.
COUNTRY_ALIASES = {
    "us": "United States", "u.s.": "United States", "usa": "United States",
    "u.s.a.": "United States", "united states of america": "United States",
    "uk": "United Kingdom", "u.k.": "United Kingdom", "england": "United Kingdom",
    "great britain": "United Kingdom", "uae": "United Arab Emirates",
    "u.a.e.": "United Arab Emirates", "ksa": "Saudi Arabia",
    "kingdom of saudi arabia": "Saudi Arabia", "macedonia (fyrom)": "North Macedonia",
    "congo, democratic republic of the": "DR Congo", "czechia": "Czech Republic",
    "مصر": "Egypt", "السعودية": "Saudi Arabia", "الامارات": "United Arab Emirates",
    "قطر": "Qatar", "الكويت": "Kuwait", "الاردن": "Jordan", "المغرب": "Morocco",
}
# Values that mean "no single country" -> treated as worldwide remote.
WORLDWIDE = {"remote (anywhere)", "worldwide", "anywhere", "remote", "global",
             "worldwide (remote)"}
UNKNOWN = {"other/unknown", "unknown", "", "nan", "none", "n/a"}


def standardize_country(s: pd.Series) -> pd.Series:
    """Map country spellings to one name. Worldwide/unknown -> NaN."""
    key = s.fillna("").astype(str).str.strip()
    low = key.str.lower()
    out = low.map(COUNTRY_ALIASES).fillna(key)
    return out.mask(low.isin(WORLDWIDE | UNKNOWN))


def country_from_location(location: pd.Series, known: set[str]) -> pd.Series:
    """Find a country name inside free location text, for rows whose country
    column is empty: 'Hungary - Budapest' -> 'Hungary', 'Cairo, Egypt' -> 'Egypt'.
    Only exact matches against `known` country names (or aliases) are used."""
    lookup = {c.lower(): c for c in known} | COUNTRY_ALIASES
    parts = location.fillna("").str.split(r"[,\-()|/]", regex=True)

    def first_country(items):
        for item in reversed(items):          # the country is usually last
            hit = lookup.get(item.strip().lower())
            if hit:
                return hit
        return np.nan

    return parts.map(first_country)


def is_worldwide(s: pd.Series) -> pd.Series:
    return s.fillna("").astype(str).str.strip().str.lower().isin(WORLDWIDE)


def assign_market_type(country: pd.Series, work_mode: pd.Series) -> pd.Series:
    """Documented rule (FR-04), checked in this order:

    1. Remote        -> the posting is marked remote, or comes from a remote board
    2. Arab          -> located in an Arab League country
    3. International -> located in any other country
    4. Unknown       -> no country and not remote
    """
    return pd.Series(
        np.select(
            [work_mode.eq("Remote"), country.isin(ARAB_COUNTRIES), country.notna()],
            ["Remote", "Arab", "International"], default="Unknown"),
        index=country.index)


# ---------------------------------------------------------------------------
# 5. Work mode, job type and seniority
# ---------------------------------------------------------------------------
_REMOTE_RE = r"\bremote\b|work from home|\bwfh\b|anywhere|عن بعد|عن بُعد"
_HYBRID_RE = r"\bhybrid\b|هجين"


def infer_work_mode(*texts: pd.Series) -> pd.Series:
    """'Remote' / 'Hybrid' if any of the given text columns says so."""
    blob = texts[0].fillna("").astype(str)
    for t in texts[1:]:
        blob = blob + " " + t.fillna("").astype(str)
    blob = blob.str.lower()
    return pd.Series(np.select([blob.str.contains(_HYBRID_RE), blob.str.contains(_REMOTE_RE)],
                               ["Hybrid", "Remote"], default=None), index=blob.index)


def standardize_job_type(s: pd.Series) -> pd.Series:
    """Collapse ~100 spellings ('full_time', "['Full-Time']", 'Vollzeit',
    'unbefristeter arbeitsvertrag' ...) into 5 standard values + Unknown.
    Order matters: 'Full-time and Contractor' is counted as Full-time."""
    low = s.fillna("").astype(str).str.lower()
    conditions = [
        low.str.contains(r"intern|trainee|praktikum"),
        low.str.contains(r"full|permanent|unbefristet|vollzeit|دوام كامل"),
        low.str.contains(r"part|teilzeit|دوام جزئي"),
        low.str.contains(r"contract|freelance|consult"),
        low.str.contains(r"temp|fixed term|befristet|seasonal"),
    ]
    choices = ["Internship", "Full-time", "Part-time", "Contract", "Temporary"]
    return pd.Series(np.select(conditions, choices, default="Unknown"), index=s.index)


_SENIORITY_RULES = [  # checked top to bottom, first match wins
    ("Intern", r"\bintern(ship)?\b|\btrainee\b|متدرب|تدريب"),
    ("Manager / Director", r"\b(head|director|vp|vice president|chief|cto|cio|ciso|manager)\b|مدير"),
    ("Lead / Principal", r"\b(lead|principal|staff|architect)\b|قائد"),
    ("Senior", r"\b(senior|sr)\b|\bsr\.|اول|خبير"),
    ("Junior", r"\b(junior|jr|entry|graduate|associate)\b|\bjr\.|مبتدئ|حديث التخرج"),
]


def _contains(s: pd.Series, pattern: str) -> pd.Series:
    """str.contains with plain "(...)" groups turned into "(?:...)" groups
    (we only need True/False, and pandas warns about capturing groups)."""
    return s.str.contains(re.sub(r"\((?!\?)", "(?:", pattern), regex=True)


def infer_seniority(title: pd.Series) -> pd.Series:
    low = title.fillna("").astype(str).str.lower()
    conds = [_contains(low, p) for _, p in _SENIORITY_RULES]
    return pd.Series(np.select(conds, [n for n, _ in _SENIORITY_RULES], default="Not specified"),
                     index=title.index)


# ---------------------------------------------------------------------------
# 6. Role category from the job title (FR-10)
# ---------------------------------------------------------------------------
# Ordered: the first matching rule wins, so specific roles come before
# generic ones ("Data Engineer" must match before plain "Engineer").
ROLE_RULES = [
    ("Data Science & AI", r"data scien|machine learning|\bml\b|\bai\b|artificial intelligence|"
                          r"deep learning|\bnlp\b|computer vision|\bllm|genai|generative|ذكاء اصطناعي|علم البيانات"),
    ("Data Engineering", r"data engineer|\betl\b|big data|data platform|data warehouse|data architect|"
                         r"analytics engineer|data (management|migration|integration|modell?er|governance|quality)|"
                         r"مهندس بيانات"),
    ("Data Analysis & BI", r"data analy|business intelligence|\bbi\b|power bi|analytics|"
                           r"business analy|reporting analyst|محلل بيانات"),
    ("Cybersecurity", r"secur|cyber|\bsoc\b|penetration|pentest|infosec|\bgrc\b|"
                      r"vulnerab|threat|أمن|امن معلومات|امن سيبراني"),
    ("DevOps & Cloud", r"devops|dev ops|\bcloud\b|\bsre\b|site reliability|platform engineer|"
                       r"infrastructure|kubernetes|\baws\b|azure|\bgcp\b|mlops"),
    ("Mobile", r"android|\bios\b|mobile|flutter|react native|swift|kotlin|موبايل|تطبيقات"),
    ("Full Stack", r"full[\s-]?stack|mern|mean stack"),
    ("Frontend", r"front[\s-]?end|\bui developer|react|angular|vue|javascript developer|واجهات"),
    ("Backend", r"back[\s-]?end|\.net|\bjava\b|python developer|node|php|django|laravel|"
                r"golang|\bgo developer|ruby|api developer|c# developer"),
    ("QA & Testing", r"\bqa\b|quality assurance|\btest|tester|sdet|اختبار"),
    ("Embedded & Hardware", r"embedded|firmware|hardware|fpga|asic|electronic|electrical|pcb|\brf\b|"
                            r"semiconductor|robotics|iot|plc|scada|الكترون|كهرباء"),
    ("IT Support & Networking", r"network|helpdesk|help desk|it support|technical support|"
                                r"system admin|sysadmin|\bit\b|شبكات|دعم فني|حاسبات"),
    ("Product & Project", r"product (manager|owner)|project manager|scrum|program manager|agile coach"),
    ("Design & UX", r"\bux\b|\bui\b|designer|user experience|مصمم|تصميم"),
    # Non-tech is checked only after every tech rule, so "Marketing Data Analyst"
    # stays a data role while "Sales Executive" is filtered out.
    ("Non-tech", r"\b(sales|marketing|recruit\w*|hr|human resources|account(ant|ing)|"
                 r"finance|cashier|driver|receptionist|customer service|call center)\b|مبيعات|تسويق|محاسب"),
    ("Software Engineering", r"software|developer|programmer|engineer.*(software|web)|web|coder|"
                             r"مطور|مبرمج|برمج"),
    ("Other Engineering", r"engineer|مهندس|فني"),
]


def categorize_role(title: pd.Series) -> pd.Series:
    low = title.fillna("").astype(str).str.lower()
    conds = [_contains(low, p) for _, p in ROLE_RULES]
    return pd.Series(np.select(conds, [n for n, _ in ROLE_RULES], default="Other / Unclassified"),
                     index=title.index)


# ---------------------------------------------------------------------------
# 7. Job titles
# ---------------------------------------------------------------------------
# "(m/f/d)", "(w/m/d)", "(f/m/x)", "m/w/d" ... gender tags used in German ads.
_GENDER_TAG = re.compile(r"\(?\b[mwfdx]\s*/\s*[mwfdx](\s*/\s*[mwfdx])?\b\)?", re.I)


def clean_title(title: pd.Series) -> pd.Series:
    t = normalize_series(title)
    t = t.str.replace(_GENDER_TAG, "", regex=True)
    t = t.str.replace(r"\s+(jobs?)$", "", regex=True, case=False)      # "Data Engineer- Sr Jobs"
    t = t.str.replace(r"\s+", " ", regex=True).str.strip(" -–|,:;")
    return t.replace("", np.nan)


# ---------------------------------------------------------------------------
# 8. Skills
# ---------------------------------------------------------------------------
# Synonyms -> one canonical lower-case key. Display casing is chosen later
# from the most common capitalized spelling in the whole dataset.
SKILL_SYNONYMS = {
    "js": "javascript", "java script": "javascript", "ts": "typescript",
    "golang": "go", "k8s": "kubernetes", "postgres": "postgresql",
    "postgre sql": "postgresql", "ms sql": "sql server", "mssql": "sql server",
    "powerbi": "power bi", "ms excel": "excel", "microsoft excel": "excel",
    "node": "node.js", "nodejs": "node.js", "node js": "node.js",
    "reactjs": "react", "react.js": "react", "vuejs": "vue", "vue.js": "vue",
    "angularjs": "angular", "dotnet": ".net", "asp.net core": "asp.net",
    "c sharp": "c#", "cpp": "c++", "amazon web services": "aws",
    "google cloud": "gcp", "google cloud platform": "gcp",
    "microsoft azure": "azure", "ci / cd": "ci/cd", "cicd": "ci/cd",
    "ml": "machine learning", "dl": "deep learning", "sklearn": "scikit-learn",
    "scikit learn": "scikit-learn", "nosql databases": "nosql",
}


def parse_skill_list(value) -> list[str]:
    """Turn any raw skills cell into a list of lower-case canonical skills.

    Handles "Python, SQL; AWS", "['python', 'sql']" and "Python | SQL".
    Duplicates inside one posting are removed, order is kept.
    """
    if not isinstance(value, str) or not value.strip():
        return []
    text = value.strip()
    if text.startswith("["):
        try:
            items = [str(x) for x in ast.literal_eval(text)]
        except (ValueError, SyntaxError):
            items = re.split(r"[;,|]", text.strip("[]"))
    else:
        items = re.split(r"[;,|\n]", text)
    seen, out = set(), []
    for item in items:
        key = re.sub(r"\s+", " ", item.strip(" '\"-•.").lower())
        key = SKILL_SYNONYMS.get(key, key)
        if 1 <= len(key) <= 40 and key not in seen:
            seen.add(key)
            out.append(key)
    return out


# ---------------------------------------------------------------------------
# 9. Salaries (FR-17)
# ---------------------------------------------------------------------------
# APPROXIMATE conversion rates (1 unit = X USD). Gulf currencies are pegged,
# the others are rough 2026 averages - update them here if you need precision.
USD_PER_UNIT = {
    "USD": 1.0, "EUR": 1.10, "GBP": 1.30, "CAD": 0.73, "AUD": 0.66, "CHF": 1.20,
    "INR": 0.0115, "PLN": 0.27, "BRL": 0.18, "SGD": 0.76,
    "AED": 1 / 3.6725, "SAR": 1 / 3.75, "QAR": 1 / 3.64, "KWD": 3.26, "BHD": 2.66,
    "OMR": 2.60, "JOD": 1.41, "EGP": 1 / 48.5, "MAD": 0.10, "TND": 0.32,
}
_CURRENCY_PATTERNS = [  # checked in order; first match wins
    # \b before the letter: "US$" must not be read as Singapore "S$"
    ("CAD", r"\bcad\b|\bc\$|\bca\$"), ("AUD", r"\baud\b|\ba\$|\bau\$"), ("SGD", r"\bsgd\b|\bs\$"),
    ("EGP", r"\begp\b|\ble\b|^le|جنيه|ج\.م"), ("SAR", r"\bsar\b|ريال سعودي|ر\.س"),
    ("AED", r"\baed\b|درهم"), ("QAR", r"\bqar\b"), ("KWD", r"\bkwd\b"), ("BHD", r"\bbhd\b"),
    ("OMR", r"\bomr\b"), ("JOD", r"\bjod\b"), ("MAD", r"\bmad\b"), ("TND", r"\btnd\b"),
    ("GBP", r"£|\bgbp\b"), ("EUR", r"€|\beur\b"), ("INR", r"₹|\binr\b"), ("PLN", r"\bpln\b|zł"),
    ("BRL", r"\br\$|\bbrl\b"), ("CHF", r"\bchf\b"), ("USD", r"\$|\busd\b|us\$"),
]
_PERIODS = [("hour", r"hour|/hr|\bhr\b|hourly|stunde"), ("day", r"\bday\b|daily"),
            ("week", r"week"), ("month", r"month|/mo\b|شهر|monat"),
            ("year", r"year|annual|/yr|\byr\b|\bpa\b|jahr|سنوي")]
ANNUAL_FACTOR = {"hour": 2080, "day": 260, "week": 52, "month": 12, "year": 1}
# Used when a salary has no currency written: local currency of the country.
COUNTRY_CURRENCY = {
    "Egypt": "EGP", "Saudi Arabia": "SAR", "United Arab Emirates": "AED", "Qatar": "QAR",
    "Kuwait": "KWD", "Bahrain": "BHD", "Oman": "OMR", "Jordan": "JOD", "Morocco": "MAD",
    "Tunisia": "TND", "United States": "USD", "United Kingdom": "GBP", "Canada": "CAD",
    "Germany": "EUR", "France": "EUR", "Spain": "EUR", "Netherlands": "EUR", "India": "INR",
}
_NUMBER = re.compile(r"(\d+(?:[.,]\d+)*)\s*([kK])?")


def _to_number(raw: str, k: str | None) -> float:
    # "1.000" (European thousands) and "13,880" both mean thousands; "18.47" is decimal.
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", raw):
        num = float(re.sub(r"[.,]", "", raw))
    else:
        num = float(raw.replace(",", ""))
    return num * 1000 if k else num


def parse_salary(text, default_currency: str | None = None) -> dict:
    """Parse free salary text into structured fields.

    >>> parse_salary("$118k - $176k")["salary_max"]
    176000.0
    """
    empty = {"salary_min": np.nan, "salary_max": np.nan, "salary_currency": None,
             "salary_period": None}
    if not isinstance(text, str) or not re.search(r"\d", text):
        return empty
    low = normalize_text(text).lower()
    nums = [_to_number(n, k) for n, k in _NUMBER.findall(low)]
    nums = [n for n in nums if n > 0][:2]
    if not nums:
        return empty
    currency = next((c for c, p in _CURRENCY_PATTERNS if re.search(p, low)), default_currency)
    period = next((p for p, rx in _PERIODS if re.search(rx, low)), None)
    lo, hi = min(nums), max(nums)
    if period is None:  # guess from the size of the number
        period = "hour" if hi < 300 else "month" if hi < 30000 and currency not in ("USD", "EUR", "GBP", "CAD") else "year"
    return {"salary_min": lo, "salary_max": hi, "salary_currency": currency, "salary_period": period}


def salary_to_usd_annual(df: pd.DataFrame) -> pd.Series:
    """Mid-point of min/max, annualized and converted to USD.

    Values outside 500 - 1,000,000 USD/year are treated as parsing errors
    (500 keeps real low Egyptian salaries, e.g. 3,000 EGP/month ~ 740 USD/year).
    """
    mid = df[["salary_min", "salary_max"]].mean(axis=1)
    usd = mid * df["salary_period"].map(ANNUAL_FACTOR) * df["salary_currency"].map(USD_PER_UNIT)
    return usd.where(usd.between(500, 1_000_000)).round(0)
