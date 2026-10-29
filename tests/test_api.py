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


def test_roadmap_stages_do_not_overlap(demo):
    res = get(demo, "/api/career/roadmap", target_role="Data Analysis & BI", have=["SQL"])
    assert res["status"] == "ok"
    names = [s["skill"] for st in res["stages"] for s in st["skills"]]
    assert len(names) == len(set(names))
    assert [st["key"] for st in res["stages"]][:2] == ["foundations", "core"]
    assert all(s["have"] == (s["skill"] == "SQL") for st in res["stages"] for s in st["skills"])
    for st in res["stages"]:
        if st["key"] == "stand_out":
            assert all(s["share"] < 0.05 and s["premium"] > 0 and s["salary_n"] >= 30 for s in st["skills"])


def test_roadmap_too_few_postings(demo):
    res = get(demo, "/api/career/roadmap", target_role="Mobile", country="Egypt", seniority="Intern")
    assert res["status"] == "too_few_postings" and res["stages"] == []


def test_roadmap_drops_excluded_skills(demo, monkeypatch):
    from api.queries import roadmap
    monkeypatch.setitem(roadmap.EXCLUDE, "Data Analysis & BI", frozenset({"SQL"}))
    res = get(demo, "/api/career/roadmap", target_role="Data Analysis & BI", country="Egypt")  # fresh cache key
    assert "SQL" not in [s["skill"] for st in res["stages"] for s in st["skills"]]


def test_roadmap_rejects_unknown_role(demo):
    assert demo["client"].get("/api/career/roadmap", params={"target_role": "Astronaut"}).status_code == 422


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


# --- regressions from the independent review ------------------------------------
def test_builder_share_with_split_uses_group_denominators(demo):
    body = {"dimension": "skill", "split_by": "market_type", "metric": "share", "limit": 5}
    res = demo["client"].post("/api/builder", json=body).json()
    matrix = get(demo, "/api/skills/matrix", dim="market_type", groups=4, top=5)
    expect = {(c["key"], c["skill"]): c["share"] for c in matrix["cells"]}
    checked = 0
    for r in res["rows"]:
        if (r["d1"], r["d0"]) in expect:
            assert r["value"] == pytest.approx(expect[(r["d1"], r["d0"])], abs=1e-6)
            checked += 1
    assert checked and "each market's postings" in res["metric_label"]


def test_builder_two_posting_dimensions_sum_to_one_per_row(demo):
    body = {"dimension": "role_category", "split_by": "seniority", "metric": "share", "limit": 50}
    res = demo["client"].post("/api/builder", json=body).json()
    per_role = {}
    for r in res["rows"]:
        per_role[r["d0"]] = per_role.get(r["d0"], 0) + r["value"]
    # every seniority value fits in the 8 split slots, so each role's row sums to 1
    assert all(v == pytest.approx(1, abs=1e-5) for v in per_role.values())  # shares are rounded to 6 dp


def test_builder_skill_category_counts_each_posting_once(demo):
    res = demo["client"].post("/api/builder", json={"dimension": "skill_category", "metric": "postings"}).json()
    j, s = demo["jobs"], demo["skills"]
    import skill_taxonomy as tax
    cat = s["skill"].map(lambda k: tax.skill_category(k.lower())[0])
    distinct = s.assign(category=cat).drop_duplicates(["job_id", "category"]).groupby("category").size()
    for r in res["rows"]:
        assert r["postings"] == distinct[r["d0"]]
    adv = set(j.loc[j["salary_usd_annual"].notna() & ~j["salary_is_estimate"], "job_id"])
    top = res["rows"][0]["d0"]
    ids = set(s.assign(category=cat).loc[lambda d: d["category"] == top, "job_id"])
    assert res["rows"][0]["salary_n"] == len(ids & adv)


def test_salary_by_skill_hides_small_groups(demo):
    res = get(demo, "/api/salary/summary", dim="skill", country="Germany", role="Mobile")
    assert all(g["n"] >= res["min_n"] for g in res["groups"])
    if res["overall"]["n"] < res["min_n"]:
        assert res["overall"]["median"] is None and res["overall"]["max"] is None


def test_builder_csv_neutralizes_formulas():
    from api.queries.builder import _cell
    assert _cell("+OneX") == "'+OneX" and _cell("@Orchard") == "'@Orchard" and _cell("Python") == "Python"


def test_compare_warns_when_provenance_differs(demo):
    res = demo["client"].post("/api/compare", json={"a": {}, "b": {"provenance": "observed"}}).json()
    assert any(w["code"] == "different_provenance" for w in res["warnings"])


def test_raw_postings_are_rate_limited(demo, monkeypatch):
    import api.main as m
    monkeypatch.setattr(m, "RAW_LIMIT_PER_MINUTE", 3)
    m._raw_hits.clear()
    codes = [demo["client"].get("/api/jobs", params={"page": i + 1}).status_code for i in range(4)]
    m._raw_hits.clear()
    assert codes == [200, 200, 200, 429]


def test_spa_route_rejects_non_relative_paths():
    from api.main import SAFE_PATH
    assert SAFE_PATH.fullmatch("assets/index-abc.js")
    assert not SAFE_PATH.fullmatch(r"\\10.0.0.1\share\x")
    assert not SAFE_PATH.fullmatch("C:/Windows/win.ini")
