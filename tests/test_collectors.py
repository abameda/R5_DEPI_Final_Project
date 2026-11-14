"""Offline tests for the fresh-postings collector (no network: fetches are faked)."""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
import collectors  # noqa: E402
import loaders  # noqa: E402
import skill_taxonomy as tax  # noqa: E402


def test_plain_text_strips_double_escaped_html():
    assert collectors.plain_text("&lt;p&gt;Use &lt;b&gt;Python&lt;/b&gt; &amp;amp; SQL&lt;/p&gt;") == "Use Python & SQL"
    assert collectors.plain_text("") is None


def test_extract_skills_avoids_ambiguous_words():
    found = tax.extract_skills("Python, R and Golang. React.js and Node.js. Excel in teamwork; go to work.")
    assert found == ["Python", "React", "Node.js", "Go", "R"]
    assert tax.extract_skills("Rails or JavaScript, not Java") == ["Java", "JavaScript", "Ruby on Rails"] or \
        set(tax.extract_skills("Rails or JavaScript")) == {"JavaScript", "Ruby on Rails"}
    assert "Excel" not in tax.extract_skills("We excel at delivery")


def test_tech_only_keeps_tech_titles_and_skills_come_from_text():
    df = pd.DataFrame({"title": ["Senior Data Engineer", "Sales Executive", "Picker"],
                       "skills": ["python", None, None], "description": ["Airflow and dbt", "CRM", None]})
    out = collectors.add_skills(collectors.tech_only(df))
    assert out["title"].tolist() == ["Senior Data Engineer"]
    assert set(out["skills"].iloc[0].split(", ")) == {"Python", "Airflow", "dbt"}


def _fake_source(jobs):
    def fetch():
        for j in jobs:
            yield collectors.row("fakeboard", **j)
    return fetch


def test_collect_writes_one_csv_and_survives_a_failing_source(tmp_path, monkeypatch):
    def broken():
        raise RuntimeError("API down")
        yield  # pragma: no cover
    monkeypatch.setitem(collectors.SOURCES, "fake", _fake_source([
        {"id": "1", "title": "Backend Developer", "description": "Django, PostgreSQL", "link": "https://x/1"},
        {"id": "1", "title": "Backend Developer", "description": "Django, PostgreSQL", "link": "https://x/1"},
        {"id": "2", "title": "Accountant"}]))
    monkeypatch.setitem(collectors.SOURCES, "broken", broken)
    counts = collectors.collect(["fake", "broken"], tmp_path, pd.Timestamp("2026-11-14").date())
    assert counts == {"fake": 1, "broken": -1}
    out = pd.read_csv(tmp_path / "2026-11-14" / "fake.csv")
    assert set(out["skills"].iloc[0].split(", ")) == {"Django", "PostgreSQL"}
    assert out["collected_at"].tolist() == ["2026-11-14"]


def test_load_fresh_keeps_latest_run_and_marks_skills_observed(tmp_path, monkeypatch):
    for day, title in [("2026-11-01", "Data Analyst"), ("2026-11-14", "Senior Data Analyst")]:
        (tmp_path / day).mkdir()
        pd.DataFrame([collectors.row("fakeboard", id="7", title=title, skills="SQL", updated="2026-10-30",
                                     link="https://x/7", collected_at=day)]).to_csv(tmp_path / day / "fake.csv",
                                                                                   index=False)
    monkeypatch.setattr(loaders, "FRESH", tmp_path)
    df = loaders.load_fresh()
    assert len(df) == 1 and df["title"].iloc[0] == "Senior Data Analyst"
    assert df["skills_observed_raw"].iloc[0] == "SQL" and df["source_dataset"].iloc[0] == "fresh_api_collection"
    assert list(df.columns) == loaders.STAGING_COLUMNS


def test_load_fresh_without_runs_is_empty(tmp_path, monkeypatch):
    monkeypatch.setattr(loaders, "FRESH", tmp_path / "none")
    assert loaders.load_fresh().empty


def test_load_fresh_drops_links_of_postings_gone_from_the_latest_run(tmp_path, monkeypatch):
    for day, ids in [("2026-11-01", ["1", "2"]), ("2026-11-14", ["2"])]:
        (tmp_path / day).mkdir()
        pd.DataFrame([collectors.row("fakeboard", id=i, title="QA Engineer", link=f"https://x/{i}", collected_at=day)
                      for i in ids]).to_csv(tmp_path / day / "fake.csv", index=False)
    monkeypatch.setattr(loaders, "FRESH", tmp_path)
    df = loaders.load_fresh().set_index("source_record_id")
    assert pd.isna(df.loc["1", "url"]) and df.loc["2", "url"] == "https://x/2"


def test_remote_eligibility_lists_are_not_countries():
    assert collectors.remote_scope("Canada, USA") == "Remote"
    assert collectors.remote_scope("US, UK + 35 other countries") == "Remote"
    assert collectors.remote_scope(None) == "Remote"
    assert collectors.remote_scope("Germany") == "Germany"
