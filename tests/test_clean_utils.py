"""Unit tests for the cleaning rules (NFR-24: >= 15 tests).

Run from the project root:   python -m pytest -q
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import clean_utils as cu  # noqa: E402


# --- text normalization -----------------------------------------------------
def test_normalize_text_fixes_mojibake_and_whitespace():
    # ftfy repairs the broken bytes and also straightens the curly quote
    assert cu.normalize_text("  Weâ€™re   hiring\n") == "We're hiring"


def test_normalize_text_arabic_diacritics_letters_and_digits():
    # diacritics removed, أ -> ا, ى -> ي, Arabic-Indic digits -> Western
    assert cu.normalize_text("مُطَوِّر أنظمة مستوى ٥") == "مطور انظمة مستوي 5"


def test_normalize_text_removes_tatweel_and_empty_becomes_nan():
    assert cu.normalize_text("مهـــندس") == "مهندس"
    assert np.isnan(cu.normalize_text("   "))
    assert np.isnan(cu.normalize_text(None))


def test_match_key_ignores_case_and_punctuation():
    a = cu.match_key(pd.Series(["Data-Engineer (Remote)"]))[0]
    b = cu.match_key(pd.Series(["data engineer remote"]))[0]
    assert a == b


# --- personal data ----------------------------------------------------------
@pytest.mark.parametrize("text", [
    "Send your CV to hr.team@company.com today",
    "Call +20 100 123 4567 now",
    "WhatsApp 01012345678",
    "Phone (555) 123-4567",
])
def test_remove_pii_removes_emails_and_phones(text):
    out = cu.remove_pii(pd.Series([text]))[0]
    assert "@" not in out
    assert sum(ch.isdigit() for ch in out) == 0   # no phone digits left
    assert "[email]" in out or "[phone]" in out


def test_remove_pii_keeps_salary_numbers():
    text = "Salary 13,880 - 63,797 EGP monthly"
    assert cu.remove_pii(pd.Series([text]))[0] == text


# --- language ---------------------------------------------------------------
@pytest.mark.parametrize("text,expected", [
    ("Senior Data Engineer", "en"), ("مطور ويب", "ar"),
    ("مطور ويب متكامل Full Stack Developer", "mixed"), ("12345", "unknown"),
])
def test_detect_language(text, expected):
    assert cu.detect_language(text) == expected


# --- countries & market type ------------------------------------------------
def test_standardize_country_aliases_and_worldwide():
    s = pd.Series(["USA", "U.K.", "UAE", "Remote (Anywhere)", "Other/Unknown", "Egypt"])
    out = cu.standardize_country(s).tolist()
    assert out[:3] == ["United States", "United Kingdom", "United Arab Emirates"]
    assert pd.isna(out[3]) and pd.isna(out[4]) and out[5] == "Egypt"


def test_country_from_location():
    loc = pd.Series(["Hungary - Budapest", "Cairo, Egypt", "Asia"])
    out = cu.country_from_location(loc, {"Hungary", "Egypt"}).tolist()
    assert out[:2] == ["Hungary", "Egypt"] and pd.isna(out[2])


def test_market_type_rule_order():
    country = pd.Series(["Egypt", "Egypt", "Germany", np.nan])
    mode = pd.Series(["Remote", "On-site", "On-site", "Not specified"])
    assert cu.assign_market_type(country, mode).tolist() == ["Remote", "Arab", "International", "Unknown"]


# --- categories -------------------------------------------------------------
def test_job_type_standardization():
    s = pd.Series(["full_time", "['Full-Time']", "Full-time and Contractor", "contractor",
                   "Unbefristeter arbeitsvertrag", "Internship", "Mid, fulltime fixed term", None])
    assert cu.standardize_job_type(s).tolist() == [
        "Full-time", "Full-time", "Full-time", "Contract", "Full-time", "Internship", "Full-time", "Unknown"]


def test_seniority():
    s = pd.Series(["Sr. Data Engineer", "Junior Backend Developer", "Head of Data", "Data Analyst Intern",
                   "Data Analyst"])
    assert cu.infer_seniority(s).tolist() == [
        "Senior", "Junior", "Manager / Director", "Intern", "Not specified"]


@pytest.mark.parametrize("title,expected", [
    ("Senior Data Engineer", "Data Engineering"),
    ("Machine Learning Engineer", "Data Science & AI"),
    ("Marketing Data Analyst", "Data Analysis & BI"),
    ("Sales Executive", "Non-tech"),
    ("Flutter Developer", "Mobile"),
    ("مطور ويب", "Software Engineering"),
    ("SOC Analyst", "Cybersecurity"),
])
def test_categorize_role(title, expected):
    assert cu.categorize_role(pd.Series([title]))[0] == expected


def test_clean_title_removes_gender_tags_and_jobs_suffix():
    s = pd.Series(["Data Engineer (m/w/d)", "Data Engineer- Sr Jobs"])
    assert cu.clean_title(s).tolist() == ["Data Engineer", "Data Engineer- Sr"]


# --- skills -----------------------------------------------------------------
def test_parse_skill_list_formats_and_synonyms():
    assert cu.parse_skill_list("['python', 'sql', 'k8s']") == ["python", "sql", "kubernetes"]
    assert cu.parse_skill_list("Python, SQL; Python | ReactJS") == ["python", "sql", "react"]
    assert cu.parse_skill_list(np.nan) == []


# --- salaries ---------------------------------------------------------------
@pytest.mark.parametrize("text,lo,hi,cur,period", [
    ("$118k - $176k", 118000, 176000, "USD", "year"),
    ("US$52 - 55 per hour", 52, 55, "USD", "hour"),
    ("13,880 - 63,797 EGP / monthly (gross)", 13880, 63797, "EGP", "month"),
    ("€1.000 – €1.500 per month", 1000, 1500, "EUR", "month"),
    ("CAD $136,000 – CAD $187,000 per year", 136000, 187000, "CAD", "year"),
    ("10000 - 16000 جنيه مصري", 10000, 16000, "EGP", "month"),
])
def test_parse_salary(text, lo, hi, cur, period):
    p = cu.parse_salary(text)
    assert (p["salary_min"], p["salary_max"], p["salary_currency"], p["salary_period"]) == (lo, hi, cur, period)


def test_parse_salary_without_numbers():
    assert np.isnan(cu.parse_salary("Not disclosed")["salary_min"])


def test_salary_to_usd_annual_and_outliers():
    df = pd.DataFrame({"salary_min": [50, 10, 4000], "salary_max": [50, 10, 4000],
                       "salary_currency": ["USD", "USD", "AED"], "salary_period": ["hour", "year", "month"]})
    out = cu.salary_to_usd_annual(df).tolist()
    assert out[0] == 104000 and np.isnan(out[1]) and out[2] == round(4000 * 12 / 3.6725)
