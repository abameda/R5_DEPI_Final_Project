"""Save the project outputs in formats you can open with a double-click.

Run from the project root (after `python src/pipeline.py`):
    python scripts/export_for_viewing.py

Creates:
    exports/01_EDA_and_cleaning.html   the executed notebook, opens in any browser
    exports/data_quality_report.html   the pipeline report, opens in any browser
    exports/jobs_clean.xlsx            the clean data for Excel:
        - jobs           every clean posting (Excel limit is 1,048,576 rows, we have ~590k)
        - top_skills     skill counts per market type (job_skills.csv has 3M rows, too big for Excel)
        - summary        postings per market / country / role
"""
import subprocess
import sys
from pathlib import Path

import markdown
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
EXPORTS = ROOT / "exports"
EXPORTS.mkdir(exist_ok=True)
EXCEL_CELL_LIMIT = 32_767  # Excel cannot store more characters than this in one cell


def notebook_to_html():
    subprocess.run([sys.executable, "-m", "jupyter", "nbconvert", "--to", "html",
                    str(ROOT / "notebooks" / "01_EDA_and_cleaning.ipynb"), "--output-dir", str(EXPORTS)],
                   check=True)


def report_to_html():
    md_text = (ROOT / "reports" / "data_quality_report.md").read_text(encoding="utf-8")
    body = markdown.markdown(md_text, extensions=["tables"])
    style = ("body{font-family:Segoe UI,Arial,sans-serif;max-width:1100px;margin:32px auto;padding:0 16px;color:#111}"
             "table{border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:4px 10px;text-align:right}"
             "th{background:#f3f3f1}td:first-child,th:first-child{text-align:left}")
    html = f"<!doctype html><html><head><meta charset='utf-8'><title>Data Quality Report</title><style>{style}</style></head><body>{body}</body></html>"
    (EXPORTS / "data_quality_report.html").write_text(html, encoding="utf-8")


def data_to_excel():
    jobs = pd.read_csv(PROCESSED / "jobs_clean.csv", low_memory=False)
    skills = pd.read_csv(PROCESSED / "job_skills.csv")

    jobs["description"] = jobs["description"].str.slice(0, EXCEL_CELL_LIMIT)

    # skills summary: % of postings per market that list each skill
    with_market = skills.merge(jobs[["job_id", "market_type"]], on="job_id")
    postings = jobs[jobs["skills_count"] > 0].groupby("market_type").size()
    top_skills = with_market.groupby(["skill", "market_type"]).size().unstack(fill_value=0)
    top_skills = top_skills.assign(total=top_skills.sum(axis=1)).sort_values("total", ascending=False).head(500)
    for market in postings.index:
        if market in top_skills:
            top_skills[f"{market} %"] = (top_skills[market] / postings[market] * 100).round(1)

    summary = pd.concat({
        "market_type": jobs["market_type"].value_counts(),
        "country (top 40)": jobs["country"].value_counts().head(40),
        "role_category": jobs["role_category"].value_counts(),
    }).rename("postings").to_frame()

    # xlsxwriter in constant-memory mode writes ~600k rows without using lots of RAM
    with pd.ExcelWriter(EXPORTS / "jobs_clean.xlsx", engine="xlsxwriter",
                        engine_kwargs={"options": {"constant_memory": True, "strings_to_urls": False}}) as xl:
        summary.to_excel(xl, sheet_name="summary")
        top_skills.to_excel(xl, sheet_name="top_skills")
        jobs.to_excel(xl, sheet_name="jobs", index=False)


if __name__ == "__main__":
    notebook_to_html(); print("saved exports/01_EDA_and_cleaning.html")
    report_to_html(); print("saved exports/data_quality_report.html")
    data_to_excel(); print("saved exports/jobs_clean.xlsx")
