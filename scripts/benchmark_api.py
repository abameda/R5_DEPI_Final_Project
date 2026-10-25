"""Time the analytics API on a store (default: the real one) with realistic workloads.

    python scripts/benchmark_api.py                 # data/analytics/jmi.duckdb
    python scripts/benchmark_api.py --db data/analytics/demo.duckdb --runs 3

"cold" = the result cache is cleared before every call (DuckDB still keeps
its own buffers warm, as in a running server); "cached" = a repeated call.
Writes a markdown table to stdout.
"""
from __future__ import annotations

import argparse
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

WORKLOAD = [
    ("GET", "/api/meta", None),
    ("GET", "/api/overview", None),
    ("GET", "/api/overview?market=Arab", None),
    ("GET", "/api/overview?country=Egypt&role=Data%20Analysis%20%26%20BI", None),
    ("GET", "/api/overview?provenance=observed&cohort=collected_2026", None),
    ("GET", "/api/breakdown?dim=cohort&q=engineer", None),
    ("GET", "/api/jobs?page=1&sort=newest", None),
    ("GET", "/api/jobs?q=data%20engineer&sort=salary_high&page=3", None),
    ("GET", "/api/jobs?skill=Python&skill=SQL&country=United%20States", None),
    ("GET", "/api/skills/top?limit=30", None),
    ("GET", "/api/skills/matrix?dim=role_category&groups=10&top=16", None),
    ("GET", "/api/skills/matrix?dim=country&groups=15&top=18&market=International", None),
    ("GET", "/api/skills/cooccurrence?limit=18", None),
    ("GET", "/api/skills/detail?name=Python", None),
    ("GET", "/api/career/gap?target_role=Data%20Analysis%20%26%20BI&have=SQL&have=Excel&market=Arab", None),
    ("GET", "/api/salary/summary?dim=country", None),
    ("GET", "/api/salary/summary?dim=skill&period=year", None),
    ("GET", "/api/geo/countries", None),
    ("GET", "/api/trends", None),
    ("GET", "/api/companies?sort=postings", None),
    ("GET", "/api/companies/profile?name=Deloitte", None),
    ("GET", "/api/insights", None),
    ("GET", "/api/quality", None),
    ("POST", "/api/compare", {"a": {"country": ["Egypt"]}, "b": {"country": ["United States"]}}),
    ("POST", "/api/compare", {"a": {"skill": ["Python"]}, "b": {"skill": ["SQL"]}}),
    ("POST", "/api/builder", {"dimension": "skill", "split_by": "market_type", "metric": "share"}),
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=ROOT / "data" / "analytics" / "jmi.duckdb")
    parser.add_argument("--runs", type=int, default=5)
    args = parser.parse_args()

    from fastapi.testclient import TestClient

    from api import db
    from api.main import app
    store = db.reset_store(args.db)
    client = TestClient(app)
    print(f"Store: {args.db} ({store.meta.get('dataset_kind')}), {args.runs} cold runs per request\n")
    print("| Request | cold median (ms) | cold max (ms) | cached (ms) | response (KB) |")
    print("|---|---:|---:|---:|---:|")
    colds_all = []
    for method, url, body in WORKLOAD:
        colds = []
        size = 0
        for _ in range(args.runs):
            db.cache._data.clear()
            t = time.perf_counter()
            r = client.request(method, url, json=body)
            colds.append((time.perf_counter() - t) * 1000)
            assert r.status_code == 200, (url, r.status_code, r.text[:200])
            size = len(r.content)
        t = time.perf_counter()
        client.request(method, url, json=body)
        cached = (time.perf_counter() - t) * 1000
        colds_all += colds
        label = f"{method} {url}" + (f" {body}" if body else "")
        print(f"| `{label[:110]}` | {statistics.median(colds):.0f} | {max(colds):.0f} | {cached:.1f} | {size / 1024:.1f} |")
    colds_all.sort()
    p95 = colds_all[int(0.95 * (len(colds_all) - 1))]
    print(f"\nAll cold requests: median {statistics.median(colds_all):.0f} ms, p95 {p95:.0f} ms, max {colds_all[-1]:.0f} ms")


if __name__ == "__main__":
    main()
