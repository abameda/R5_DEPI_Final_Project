# Deployment

## Local (recommended for the DEPI demo)

Requirements: Python 3.12+ (developed on 3.14), Node.js 20+ (developed on 24), ~2 GB free
disk, the raw files from the team Drive.

```bash
# 1. Python environment
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# 2. Data: unzip "before cleaning.zip" into data/raw/, then
python src/pipeline.py            # ~2-3 min -> data/processed/ + reports/
python src/build_analytics.py     # ~3 s     -> data/analytics/jmi.duckdb

# 3. Front end
cd frontend
npm ci
npm run build                     # -> frontend/dist
cd ..

# 4. Run: one process serves the API and the dashboard
uvicorn api.main:app --port 8000
# open http://localhost:8000
```

### Development mode (hot reload)

```bash
uvicorn api.main:app --port 8000 --reload
cd frontend && npm run dev        # http://localhost:5173, proxies /api to :8000
```

Set `JMI_API` to point Vite at another API address.

### Without the restricted data (synthetic demo)

```bash
python scripts/make_demo_data.py              # data/demo/ + data/analytics/demo.duckdb
JMI_DB=data/analytics/demo.duckdb uvicorn api.main:app --port 8000
```

On Windows PowerShell: `$env:JMI_DB = "data/analytics/demo.duckdb"; uvicorn api.main:app --port 8000`.
The dashboard shows a red "Synthetic demo data" banner on every page; never cite its numbers.

### If `data/processed/` is locked

If a CSV is open in Excel the pipeline cannot overwrite it. Either close it or write
elsewhere and build from there:

```bash
python src/pipeline.py --out data/processed_staging
python src/build_analytics.py --processed data/processed_staging --stats reports/pipeline_stats.json
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `JMI_DB` | `data/analytics/jmi.duckdb` | Analytical store the API opens (read-only) |
| `JMI_API` | `http://127.0.0.1:8000` | Where the Vite dev server proxies `/api` |
| `PYTHON` | `.venv` interpreter | Interpreter used by the Playwright test servers |

No secrets or API keys are needed. Nothing sensitive is committed; `data/raw`,
`data/processed*`, `data/analytics`, `data/demo`, `frontend/node_modules` and
`frontend/dist` are git-ignored.

## Hosted option (only with the data owners' agreement)

The raw third-party data must not be redistributed (NFR-08). Hosting the dashboard publishes
aggregates **and** individual postings (one page at a time). Before any public deployment,
confirm the terms of each source (Kaggle dataset licence, job-board/API terms) and consider
running the hosted copy on the synthetic store or with the explorer disabled.

If approved, the app is one container-free process and fits a small VM or a free-tier
service that runs Python (e.g. a 1 vCPU / 1 GB instance):

1. Build the store and the front end locally (steps 2–3 above).
2. Copy the repository plus `data/analytics/jmi.duckdb` (~70 MB) and `frontend/dist` to the host.
3. `pip install -r requirements.txt`, then
   `uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 2` behind HTTPS
   (the platform's TLS or a reverse proxy such as Caddy).
4. Keep the per-client rate limit on raw postings (`RAW_LIMIT_PER_MINUTE` in `api/main.py`);
   if several workers or instances run, move it to the proxy so the limit is shared.

No paid service is required. Nothing has been deployed by this work.

## Rebuilding after data changes

`python src/pipeline.py` → `python src/build_analytics.py` → restart the API (the store is
opened read-only at start-up and the result cache lives in memory).
