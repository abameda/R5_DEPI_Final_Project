"""API contract + analytics tests on the SYNTHETIC demo store.

Every metric is recomputed independently with pandas from the CSV files the
store was built from, so a wrong SQL denominator or join fails the test.
"""
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

import make_demo_data  # noqa: E402
from api import db  # noqa: E402
from api.main import app  # noqa: E402
from build_analytics import build  # noqa: E402


@pytest.fixture(scope="module")
def demo(tmp_path_factory):
    folder = tmp_path_factory.mktemp("demo")
    make_demo_data.write(folder, n=3000, seed=11)
    store_path = folder / "demo.duckdb"
    build(folder, store_path, folder / "pipeline_stats.json", synthetic=True)
    db.reset_store(store_path)
    jobs = pd.read_csv(folder / "jobs_clean.csv")
    skills = pd.read_csv(folder / "job_skills.csv")
    yield {"jobs": jobs, "skills": skills, "client": TestClient(app)}
    db.reset_store(None)


def get(demo, url, **params):
    r = demo["client"].get(url, params=params)
    assert r.status_code == 200, r.text
    return r.json()


def skill_share(jobs, skills, skill, observed=False):
    s = skills[skills["is_observed"]] if observed else skills
    ids = set(jobs["job_id"])
    s = s[s["job_id"].isin(ids)]
    denom = s["job_id"].nunique()
    return (s["skill"] == skill).groupby(s["job_id"]).any().sum() / denom, denom


# --- overview & denominators -------------------------------------------------
def test_meta_flags_synthetic_data(demo):
    assert get(demo, "/api/meta")["dataset_kind"] == "synthetic"


def test_overview_kpis_match_pandas(demo):
    j = demo["jobs"]
    k = get(demo, "/api/overview")["kpis"]
    assert k["postings"] == len(j)
    assert k["countries"] == j["country"].nunique()
    assert k["advertised_salary"] == int((j["salary_usd_annual"].notna() & ~j["salary_is_estimate"]).sum())
    assert k["benchmark_salary"] == int((j["salary_usd_annual"].notna() & j["salary_is_estimate"]).sum())
    assert k["with_skills"] == int((j["skills_count"] > 0).sum())


def test_breakdowns_sum_to_population(demo):
    ov = get(demo, "/api/overview", country="Egypt")
    n = ov["kpis"]["postings"]
    for key in ("roles", "markets", "seniority", "work_mode", "job_type", "sources", "cohorts"):
        assert sum(r["n"] for r in ov[key]) == n, key
        assert abs(sum(r["share"] for r in ov[key]) - 1) < 1e-3


def test_filter_matches_pandas(demo):
    j = demo["jobs"]
    exp = j[(j["country"].isin(["Egypt", "Saudi Arabia"])) & (j["role_category"] == "Data Engineering")]
    k = get(demo, "/api/overview", country=["Egypt", "Saudi Arabia"], role="Data Engineering")["kpis"]
    assert k["postings"] == len(exp)


def test_date_filter(demo):
    j = demo["jobs"]
    d = pd.to_datetime(j["posted_date"])
    exp = ((d >= "2023-03-01") & (d <= "2023-05-31")).sum()
    assert get(demo, "/api/overview", date_from="2023-03-01", date_to="2023-05-31")["kpis"]["postings"] == exp


# --- skills ------------------------------------------------------------------
@pytest.mark.parametrize("observed", [False, True])
def test_top_skill_share_matches_pandas(demo, observed):
    res = get(demo, "/api/skills/top", provenance="observed" if observed else "all")
    top = res["rows"][0]
    share, denom = skill_share(demo["jobs"], demo["skills"], top["skill"], observed)
    assert res["denominator"] == denom
    assert top["share"] == pytest.approx(share, abs=1e-6)


def test_observed_never_exceeds_all(demo):
    rows = get(demo, "/api/skills/top", limit=30)["rows"]
    assert all(r["observed"] <= r["postings"] and r["added"] == r["postings"] - r["observed"] for r in rows)


def test_skill_filter_requires_all_skills(demo):
    s = demo["skills"]
    has = lambda name: set(s.loc[s["skill"] == name, "job_id"])  # noqa: E731
    exp = len(has("Python") & has("SQL"))
    assert get(demo, "/api/overview", skill=["Python", "SQL"])["kpis"]["postings"] == exp


def test_observed_skill_filter_ignores_added_skills(demo):
    s = demo["skills"]
    exp = s.loc[(s["skill"] == "Python") & s["is_observed"], "job_id"].nunique()
    assert get(demo, "/api/overview", skill="Python", provenance="observed")["kpis"]["postings"] == exp


def test_cooccurrence_counts(demo):
    s = demo["skills"]
    res = get(demo, "/api/skills/cooccurrence", limit=6)
    link = res["links"][0]
    both = len(set(s.loc[s["skill"] == link["a"], "job_id"]) & set(s.loc[s["skill"] == link["b"], "job_id"]))
    assert link["together"] == both
    assert 0 <= link["jaccard"] <= 1


def test_matrix_shares_use_group_denominators(demo):
    res = get(demo, "/api/skills/matrix", dim="role_category", groups=3, top=3)
    j, s = demo["jobs"], demo["skills"]
    cell = res["cells"][0]
    members = set(j.loc[j["role_category"] == cell["key"], "job_id"])
    sub = s[s["job_id"].isin(members)]
    assert cell["share"] == pytest.approx((sub["skill"] == cell["skill"]).sum() / sub["job_id"].nunique(), abs=1e-6)


# --- salary ------------------------------------------------------------------
def test_salary_median_uses_advertised_only(demo):
    j = demo["jobs"]
    adv = j.loc[j["salary_usd_annual"].notna() & ~j["salary_is_estimate"], "salary_usd_annual"]
    bench = j.loc[j["salary_usd_annual"].notna() & j["salary_is_estimate"], "salary_usd_annual"]
    a = get(demo, "/api/salary/summary", dim="role_category")["overall"]
    b = get(demo, "/api/salary/summary", dim="role_category", kind="benchmark")["overall"]
    assert a["n"] == len(adv) and a["median"] == pytest.approx(adv.median())
    assert b["n"] == len(bench) and b["median"] == pytest.approx(bench.median())


def test_salary_groups_below_minimum_are_hidden(demo):
    res = get(demo, "/api/salary/summary", dim="country", country="Egypt", role="Mobile")
    assert all(g["n"] >= res["min_n"] for g in res["groups"])


# --- explorer ----------------------------------------------------------------
def test_jobs_pagination_and_total(demo):
    a = get(demo, "/api/jobs", page=1, page_size=10, sort="newest")
    b = get(demo, "/api/jobs", page=2, page_size=10, sort="newest")
    assert a["total"] == len(demo["jobs"])
    assert not {r["job_id"] for r in a["rows"]} & {r["job_id"] for r in b["rows"]}
    dates = [r["posted_date"] for r in a["rows"] + b["rows"]]
    assert dates == sorted(dates, reverse=True)


def test_job_detail_has_skill_provenance(demo):
    row = get(demo, "/api/jobs", skill="Python")["rows"][0]
    detail = get(demo, f"/api/jobs/{row['job_id']}")
    assert any(s["skill"] == "Python" for s in detail["skill_list"])
    assert all("observed" in s for s in detail["skill_list"])


def test_search_escapes_like_wildcards(demo):
    assert get(demo, "/api/jobs", q="%")["total"] == 0


# --- comparison / career / trends ------------------------------------------------
def test_compare_segments_are_normalized_independently(demo):
    r = demo["client"].post("/api/compare", json={"a": {"country": ["Egypt"]}, "b": {"country": ["United States"]}})
    assert r.status_code == 200
    res = r.json()
    j, s = demo["jobs"], demo["skills"]
    for key, country in (("a", "Egypt"), ("b", "United States")):
        sk = res["skills"][0]
        share, _ = skill_share(j[j["country"] == country], s, sk["skill"])
        assert sk[f"{key}_share"] == pytest.approx(share, abs=1e-6)


def test_compare_warns_on_tiny_segment(demo):
    res = demo["client"].post("/api/compare", json={"a": {"country": ["Egypt"], "role": ["Mobile"],
                                                          "seniority": ["Intern"]}, "b": {}}).json()
    assert any(w["code"] == "too_few_postings" for w in res["warnings"])


def test_career_gap_ranks_missing_skills(demo):
    res = get(demo, "/api/career/gap", target_role="Data Analysis & BI", have=["SQL"])
    assert res["status"] == "ok"
    assert all(not p["have"] for p in res["priorities"])
    bounds = [p["wilson_lower"] for p in res["priorities"]]
    assert bounds == sorted(bounds, reverse=True)
    assert 0 <= res["alignment"]["score"] <= 1


def test_career_gap_too_few_postings(demo):
    res = get(demo, "/api/career/gap", target_role="Mobile", country="Egypt", seniority="Intern")
    assert res["status"] == "too_few_postings" and res["priorities"] == []


def test_trends_never_mix_cohorts_in_one_point(demo):
    res = get(demo, "/api/trends", series="Python")
    for p in res["skill_trend"]["series"][0]["points"]:
        assert p["cohort"] in ("kaggle_2023", "collected_2026")
    months_2023 = {m["month"][:4] for m in res["skill_trend"]["months"] if m["cohort"] == "kaggle_2023"}
    assert months_2023 == {"2023"}


# --- builder & validation -------------------------------------------------------
def test_builder_share_and_csv(demo):
    body = {"dimension": "role_category", "metric": "share"}
    res = demo["client"].post("/api/builder", json=body).json()
    assert sum(r["value"] for r in res["rows"]) == pytest.approx(1, abs=1e-3)
    csv = demo["client"].post("/api/builder.csv", json=body)
    assert csv.status_code == 200 and csv.text.startswith("Role,Share of postings")


@pytest.mark.parametrize("body", [
    {"dimension": "skill", "split_by": "skill_category", "metric": "share"},
    {"dimension": "skill", "metric": "remote_share"},
    {"dimension": "country; drop table jobs", "metric": "postings"},
])
def test_builder_rejects_invalid_combinations(demo, body):
    assert demo["client"].post("/api/builder", json=body).status_code == 422


@pytest.mark.parametrize("url", [
    "/api/overview?market=Mars", "/api/jobs?sort=evil", "/api/breakdown?dim=description",
    "/api/jobs?page=100000", "/api/overview?date_from=2024-01-01&date_to=2023-01-01",
])
def test_invalid_parameters_are_rejected(demo, url):
    assert demo["client"].get(url).status_code == 422


def test_unknown_resources_404(demo):
    assert demo["client"].get("/api/skills/detail", params={"name": "Nope"}).status_code == 404
    assert demo["client"].get("/api/jobs/doesnotexist").status_code == 404


def test_insights_are_grounded(demo):
    res = get(demo, "/api/insights")
    assert res and all(i["denominator"] >= i["n"] >= 0 for i in res if i["n"] is not None)
    top = next(i for i in res if i["id"] == "top_skill")
    share, _ = skill_share(demo["jobs"], demo["skills"], top["drill"]["params"]["skill"])
    assert top["value"] == pytest.approx(share, abs=1e-6)


def test_quality_endpoint(demo):
    q = get(demo, "/api/quality")
    assert q["totals"]["postings"] == len(demo["jobs"])
    assert sum(r["postings"] for r in q["per_source"]) == len(demo["jobs"])
