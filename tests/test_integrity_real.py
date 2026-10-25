"""KPI S1 - dashboard figures vs. an independent calculation on the REAL data.

Recomputes a sample of dashboard figures with pandas directly from the
processed CSV files (not from the DuckDB store) and compares them with the API.
Skipped automatically when the real analytical store has not been built.

    python -m pytest tests/test_integrity_real.py -v
"""
import os
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
STORE = Path(os.environ.get("JMI_REAL_DB", ROOT / "data" / "analytics" / "jmi.duckdb"))

pytestmark = pytest.mark.skipif(not STORE.exists(), reason="real analytical store not built")


@pytest.fixture(scope="module")
def real():
    from fastapi.testclient import TestClient

    from api import db
    from api.main import app
    store = db.reset_store(STORE)
    if store.meta.get("dataset_kind") != "real":
        pytest.skip("store is synthetic")
    processed = Path(store.meta["processed_dir"])
    jobs = pd.read_csv(processed / "jobs_clean.csv", low_memory=False,
                       usecols=["job_id", "country", "market_type", "role_category", "company",
                                "salary_usd_annual", "salary_is_estimate", "skills_count", "posted_date"])
    skills = pd.read_csv(processed / "job_skills.csv")
    yield {"jobs": jobs, "skills": skills, "client": TestClient(app)}
    db.reset_store(None)


def api(real, url, **params):
    r = real["client"].get(url, params=params)
    assert r.status_code == 200, r.text
    return r.json()


def test_figure_01_total_postings(real):
    assert api(real, "/api/overview")["kpis"]["postings"] == len(real["jobs"])


def test_figure_02_countries(real):
    assert api(real, "/api/overview")["kpis"]["countries"] == real["jobs"]["country"].nunique()


def test_figure_03_market_type_counts(real):
    exp = real["jobs"]["market_type"].value_counts().to_dict()
    got = {r["key"]: r["n"] for r in api(real, "/api/overview")["markets"]}
    assert got == exp


def test_figure_04_top_countries(real):
    exp = real["jobs"]["country"].value_counts().head(10).to_dict()
    got = {r["country"]: r["n"] for r in api(real, "/api/geo/countries")["countries"][:10]}
    assert got == exp


def test_figure_05_top_skill_shares(real):
    s = real["skills"]
    denom = s["job_id"].nunique()
    exp = (s["skill"].value_counts().head(10) / denom).to_dict()
    got = {r["skill"]: r["share"] for r in api(real, "/api/skills/top", limit=10)["rows"]}
    assert got.keys() == exp.keys()
    for k, v in exp.items():
        assert got[k] == pytest.approx(v, abs=1e-5)


def test_figure_06_observed_only_skill_shares(real):
    s = real["skills"][real["skills"]["is_observed"]]
    denom = s["job_id"].nunique()
    exp = (s["skill"].value_counts().head(5) / denom).to_dict()
    got = {r["skill"]: r["share"] for r in api(real, "/api/skills/top", limit=5, provenance="observed")["rows"]}
    for k, v in exp.items():
        assert got[k] == pytest.approx(v, abs=1e-5)


def test_figure_07_egypt_role_mix(real):
    j = real["jobs"]
    exp = j.loc[j["country"] == "Egypt", "role_category"].value_counts().to_dict()
    got = {r["key"]: r["n"] for r in api(real, "/api/overview", country="Egypt")["roles"]}
    assert got == exp


def test_figure_08_advertised_salary_median_by_role(real):
    j = real["jobs"]
    adv = j[j["salary_usd_annual"].notna() & ~j["salary_is_estimate"].astype(bool)]
    exp = adv.groupby("role_category")["salary_usd_annual"].agg(["size", "median"])
    exp = exp[exp["size"] >= 10]
    got = {g["key"]: g for g in api(real, "/api/salary/summary", dim="role_category")["groups"]}
    for role, row in exp.iterrows():
        assert got[role]["n"] == row["size"]
        assert got[role]["median"] == pytest.approx(row["median"])


def test_figure_09_top_employer_postings(real):
    j = real["jobs"]
    exp = j["company"].value_counts().head(200)
    got = {r["company"]: r["postings"] for r in api(real, "/api/companies", include_placeholders="true")["rows"]}
    for name, n in got.items():
        assert exp[name] == n


def test_figure_10_python_share_in_data_analysis(real):
    j, s = real["jobs"], real["skills"]
    ids = set(j.loc[j["role_category"] == "Data Analysis & BI", "job_id"])
    sub = s[s["job_id"].isin(ids)]
    exp = (sub["skill"] == "Python").sum() / sub["job_id"].nunique()
    rows = api(real, "/api/skills/top", role="Data Analysis & BI", limit=40)["rows"]
    assert next(r for r in rows if r["skill"] == "Python")["share"] == pytest.approx(exp, abs=1e-5)


def test_sudan_search_rows_are_not_labeled_sudan(real):
    assert (real["jobs"]["country"] == "Sudan").sum() == 0
    assert all(c["country"] != "Sudan" for c in api(real, "/api/geo/countries")["countries"])
