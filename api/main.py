"""Job Market Intelligence API.

    uvicorn api.main:app --port 8000            # API (+ the built dashboard if frontend/dist exists)

Every analytical endpoint accepts the global filters as query parameters
(see api/filters.py) and returns aggregates computed by DuckDB. Raw postings
are only served one page at a time (job explorer); bulk export is limited to
aggregates, so third-party data is never redistributed (NFR-08).
"""
from __future__ import annotations

import json
import logging
import time
from typing import Annotated, Literal

from fastapi import Body, Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .db import ROOT, cache, get_store
from .filters import Filters, filters_from_query
from .labels import (COHORT_LABELS, COHORT_NOTES, DIMENSION_LABELS, MIN_GROUP_POSTINGS, MIN_SALARY_N,
                     RELIABLE_SALARY_N, SOURCE_LABELS)
from .queries import builder, compare, market, quality, salary, skills, trends

log = logging.getLogger("jmi.api")
app = FastAPI(title="Job Market Intelligence API", version="1.0.0",
              description="Analytics over the DEPI job-posting dataset. Findings describe the collected sample, "
                          "not the whole labour market.")
F = Annotated[Filters, Depends(filters_from_query)]


def cached(endpoint: str, f: Filters | None, fn, **kw):
    key = endpoint + "|" + (f.key() if f else "") + "|" + json.dumps(kw, sort_keys=True, default=str)
    return cache.get_or_compute(key, fn)


@app.middleware("http")
async def timing(request: Request, call_next):
    t = time.perf_counter()
    response = await call_next(request)
    response.headers["Server-Timing"] = f"app;dur={(time.perf_counter() - t) * 1000:.1f}"
    return response


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s", request.url.path)
    return JSONResponse({"detail": "The analysis could not be computed. Please adjust the filters and retry."},
                        status_code=500)


# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    s = get_store()
    return {"status": "ok", "dataset_kind": s.meta.get("dataset_kind"), "built_at": s.meta.get("built_at"),
            "cache": {"entries": len(cache._data), "hits": cache.hits, "misses": cache.misses}}


@app.get("/api/meta")
def meta():
    s = get_store()

    def compute():
        counts = {}
        for dim in ("region", "market_type", "role_category", "seniority", "job_type", "work_mode",
                    "source_dataset", "cohort", "salary_kind"):
            counts[dim] = s.rows(f"SELECT {dim} AS value, count(*) AS n FROM jobs WHERE {dim} IS NOT NULL "
                                 f"GROUP BY 1 ORDER BY n DESC")
        counts["country"] = s.rows("SELECT country AS value, any_value(region) AS region, count(*) AS n FROM jobs "
                                   "WHERE country IS NOT NULL GROUP BY 1 ORDER BY n DESC")
        dates = s.one("SELECT min(posted_date) AS min, max(posted_date) AS max FROM jobs")
        return {
            "dataset_kind": s.meta.get("dataset_kind"),
            "built_at": s.meta.get("built_at"),
            "pipeline_generated_at": s.meta.get("pipeline_stats", {}).get("generated_at"),
            "totals": s.one("SELECT count(*) AS postings FROM jobs"),
            "dimensions": counts,
            "skill_categories": s.domains["skill_category"],
            "date_range": dates,
            "labels": {"source": SOURCE_LABELS, "cohort": COHORT_LABELS, "cohort_notes": COHORT_NOTES,
                       "dimension": DIMENSION_LABELS},
            "thresholds": {"min_group_postings": MIN_GROUP_POSTINGS, "min_salary_n": MIN_SALARY_N,
                           "reliable_salary_n": RELIABLE_SALARY_N},
        }
    return cached("meta", None, compute)


@app.get("/api/overview")
def overview(f: F):
    return cached("overview", f, lambda: market.overview(get_store(), f))


@app.get("/api/breakdown")
def breakdown(f: F, dim: str, limit: Annotated[int, Query(ge=1, le=200)] = 50):
    return cached("breakdown", f, lambda: market.breakdown(get_store(), f, dim, limit), dim=dim, limit=limit)


@app.get("/api/crosstab")
def crosstab(f: F, row: str, col: str, rows: Annotated[int, Query(ge=1, le=40)] = 12,
             cols: Annotated[int, Query(ge=1, le=20)] = 8):
    return cached("crosstab", f, lambda: market.crosstab(get_store(), f, row, col, rows, cols),
                  row=row, col=col, rows=rows, cols=cols)


@app.get("/api/insights")
def insights(f: F):
    return cached("insights", f, lambda: builder.insights(get_store(), f))


# --- jobs ------------------------------------------------------------------
@app.get("/api/jobs")
def jobs(f: F, page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=100)] = 25,
         sort: str = "newest"):
    return cached("jobs", f, lambda: market.list_jobs(get_store(), f, page, page_size, sort),
                  page=page, page_size=page_size, sort=sort)


@app.get("/api/jobs/{job_id}")
def job(job_id: str):
    if len(job_id) > 40:
        raise HTTPException(422, "Invalid posting id")
    return market.job_detail(get_store(), job_id)


# --- geography -------------------------------------------------------------
@app.get("/api/geo/countries")
def geo_countries(f: F):
    return cached("geo", f, lambda: market.countries(get_store(), f))


# --- skills ----------------------------------------------------------------
@app.get("/api/skills/top")
def skills_top(f: F, limit: Annotated[int, Query(ge=1, le=100)] = 25, category: str | None = None,
               technical: bool | None = None):
    if category and category not in get_store().domains["skill_category"]:
        raise HTTPException(422, f"Unknown skill category: {category}")
    return cached("skills_top", f, lambda: skills.top_skills(get_store(), f, limit, category, technical),
                  limit=limit, category=category, technical=technical)


@app.get("/api/skills/categories")
def skills_categories(f: F):
    return cached("skills_cat", f, lambda: skills.skill_categories(get_store(), f))


@app.get("/api/skills/matrix")
def skills_matrix(f: F, dim: str = "role_category", groups: Annotated[int, Query(ge=1, le=25)] = 10,
                  top: Annotated[int, Query(ge=1, le=30)] = 15,
                  series: Annotated[list[str], Query(max_length=30)] = []):  # noqa: B006
    return cached("skills_matrix", f, lambda: skills.by_dimension(get_store(), f, dim, groups, top, series or None),
                  dim=dim, groups=groups, top=top, series=series)


@app.get("/api/skills/cooccurrence")
def skills_cooc(f: F, limit: Annotated[int, Query(ge=2, le=40)] = 20):
    return cached("cooc", f, lambda: skills.cooccurrence(get_store(), f, limit), limit=limit)


@app.get("/api/skills/detail")
def skill_detail(f: F, name: Annotated[str, Query(min_length=1, max_length=120)]):
    return cached("skill_detail", f, lambda: skills.skill_detail(get_store(), f, name), name=name)


@app.get("/api/skills/search")
def skill_search(q: Annotated[str, Query(max_length=60)] = "", limit: Annotated[int, Query(ge=1, le=50)] = 20):
    s = get_store()
    like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    return s.rows("""SELECT t.skill, t.postings, t.observed_postings, k.category FROM skill_totals t
                     JOIN skills k USING (skill) WHERE t.skill ILIKE ? ESCAPE '\\'
                     ORDER BY (lower(t.skill) = lower(?)) DESC, t.postings DESC LIMIT ?""", [like, q, limit])


# --- career ----------------------------------------------------------------
@app.get("/api/career/gap")
def career_gap(f: F, target_role: Annotated[str, Query(max_length=60)],
               have: Annotated[list[str], Query(max_length=60)] = []):  # noqa: B006
    have = [h for h in have if 0 < len(h) <= 120]
    return cached("career", f, lambda: skills.career_gap(get_store(), f, target_role, have),
                  role=target_role, have=sorted(set(have)))


# --- salary ----------------------------------------------------------------
Kind = Literal["advertised", "benchmark"]
Periods = Annotated[list[str], Query(max_length=5)]


@app.get("/api/salary/summary")
def salary_summary(f: F, dim: str | None = "role_category", kind: Kind = "advertised",
                   period: Periods = [], limit: Annotated[int, Query(ge=1, le=40)] = 20):  # noqa: B006
    return cached("sal_sum", f, lambda: salary.salary_summary(get_store(), f, dim, kind, period, limit),
                  dim=dim, kind=kind, period=period, limit=limit)


@app.get("/api/salary/histogram")
def salary_histogram(f: F, kind: Kind = "advertised", period: Periods = []):  # noqa: B006
    return cached("sal_hist", f, lambda: salary.histogram(get_store(), f, kind, period), kind=kind, period=period)


@app.get("/api/salary/coverage")
def salary_coverage(f: F, period: Periods = []):  # noqa: B006
    return cached("sal_cov", f, lambda: salary.coverage(get_store(), f, period), period=period)


# --- trends & comparison -----------------------------------------------------
@app.get("/api/trends")
def trends_view(f: F, series: Annotated[list[str], Query(max_length=8)] = []):  # noqa: B006
    return cached("trends", f, lambda: trends.trends(get_store(), f, series), series=series)


class CompareRequest(BaseModel):
    a: Filters = Field(default_factory=Filters)
    b: Filters = Field(default_factory=Filters)


@app.post("/api/compare")
def compare_view(req: Annotated[CompareRequest, Body()]):
    s = get_store()
    req.a.validate_domains(s)
    req.b.validate_domains(s)
    return cache.get_or_compute("compare|" + req.a.key() + "|" + req.b.key(),
                                lambda: compare.compare(s, req.a, req.b))


# --- employers -----------------------------------------------------------------
@app.get("/api/companies")
def companies(f: F, search: Annotated[str | None, Query(max_length=80)] = None,
              page: Annotated[int, Query(ge=1, le=400)] = 1, page_size: Annotated[int, Query(ge=1, le=100)] = 25,
              sort: str = "postings", include_placeholders: bool = False):
    return cached("companies", f, lambda: market.companies(get_store(), f, search, page, page_size, sort,
                                                           include_placeholders),
                  search=search, page=page, page_size=page_size, sort=sort, ph=include_placeholders)


@app.get("/api/companies/profile")
def company_profile(f: F, name: Annotated[str, Query(min_length=1, max_length=120)]):
    return cached("company", f, lambda: market.company_profile(get_store(), f, name), name=name)


# --- methodology & builder -------------------------------------------------------
@app.get("/api/quality")
def quality_view():
    return cached("quality", None, lambda: quality.quality(get_store()))


@app.get("/api/builder/options")
def builder_options():
    return {"dimensions": [{"key": k, "label": DIMENSION_LABELS[k], "skill_level": v[1]}
                           for k, v in builder.DIMENSIONS.items()],
            "metrics": [{"key": k, "label": v, "skill_level": k in builder.SKILL_DIM_METRICS}
                        for k, v in builder.METRICS.items()]}


@app.post("/api/builder")
def builder_run(req: builder.BuilderRequest):
    req.filters.validate_domains(get_store())
    return cache.get_or_compute("builder|" + req.model_dump_json(), lambda: builder.run(get_store(), req))


@app.post("/api/builder.csv")
def builder_csv(req: builder.BuilderRequest):
    req.filters.validate_domains(get_store())
    result = cache.get_or_compute("builder|" + req.model_dump_json(), lambda: builder.run(get_store(), req))
    return Response(builder.to_csv(result), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="jmi_{req.dimension}_{req.metric}.csv"'})


# ---------------------------------------------------------------------------
# Built dashboard (production). In development Vite serves it and proxies /api.
DIST = ROOT / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Not found")
        file = (DIST / path).resolve()
        if path and file.is_file() and DIST in file.parents:
            return FileResponse(file)
        return FileResponse(DIST / "index.html")
