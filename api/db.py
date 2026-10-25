"""Read-only access to the DuckDB analytical store + a small result cache.

The store is immutable while the API runs (it is rebuilt offline by
src/build_analytics.py), so cached results never go stale within a process.
"""
from __future__ import annotations

import json
import os
import threading
from collections import OrderedDict
from pathlib import Path
from typing import Any, Callable

import duckdb

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data" / "analytics" / "jmi.duckdb"


class Store:
    def __init__(self, path: Path):
        if not path.exists():
            raise FileNotFoundError(
                f"Analytical store not found: {path}\n"
                "Build it with `python src/build_analytics.py` (real data) or "
                "`python scripts/make_demo_data.py` (synthetic demo).")
        self.path = path
        self._con = duckdb.connect(str(path), read_only=True)
        self._local = threading.local()
        self.meta = {k: json.loads(v) for k, v in self._con.execute("SELECT key, value FROM meta").fetchall()}
        self.domains = self._load_domains()

    # One cursor per thread: DuckDB connections are not safe to share across
    # threads, cursors of the same database are.
    def _cursor(self) -> duckdb.DuckDBPyConnection:
        cur = getattr(self._local, "cur", None)
        if cur is None:
            cur = self._local.cur = self._con.cursor()
        return cur

    def rows(self, sql: str, params: list | tuple = ()) -> list[dict[str, Any]]:
        cur = self._cursor().execute(sql, list(params))
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]

    def one(self, sql: str, params: list | tuple = ()) -> dict[str, Any]:
        out = self.rows(sql, params)
        return out[0] if out else {}

    def scalar(self, sql: str, params: list | tuple = ()):
        r = self._cursor().execute(sql, list(params)).fetchone()
        return r[0] if r else None

    def _load_domains(self) -> dict[str, list[str]]:
        """Allowed values of every low-cardinality filter (validated on input)."""
        dims = ["region", "market_type", "role_category", "seniority", "job_type", "work_mode",
                "source_dataset", "cohort", "language", "salary_kind"]
        out = {d: [r[0] for r in self._con.execute(
            f"SELECT {d} FROM jobs WHERE {d} IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC").fetchall()]
            for d in dims}
        out["skill_category"] = [r[0] for r in self._con.execute(
            "SELECT category FROM skills GROUP BY 1 ORDER BY 1").fetchall()]
        return out


class ResultCache:
    """Thread-safe LRU keyed by (endpoint, normalized parameters)."""

    def __init__(self, maxsize: int = 1024):
        self.maxsize = maxsize
        self._data: OrderedDict[str, Any] = OrderedDict()
        self._lock = threading.Lock()
        self.hits = self.misses = 0

    def get_or_compute(self, key: str, fn: Callable[[], Any]) -> Any:
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
                self.hits += 1
                return self._data[key]
        value = fn()
        with self._lock:
            self.misses += 1
            self._data[key] = value
            if len(self._data) > self.maxsize:
                self._data.popitem(last=False)
        return value


_store: Store | None = None
cache = ResultCache()


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store(Path(os.environ.get("JMI_DB", DEFAULT_DB)))
    return _store


def reset_store(path: Path | None = None) -> Store:
    """Used by tests to point the API at a different store."""
    global _store
    _store = Store(path) if path else None
    cache._data.clear()
    return _store
