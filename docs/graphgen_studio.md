# GraphGen Studio

This document outlines the FastAPI + React architecture introduced alongside the original Gradio prototype.

## Backend

- Entry point: `graphgen/api/app.py` (FastAPI application).
- Key routes:
  - `GET /api/health` – basic readiness probe.
  - `POST /api/jobs` – enqueue a GraphGen generation job. Accepts `config_path`, optional `output_dir`, and JSON overrides.
  - `GET /api/jobs` – list job metadata sorted by creation time (descending).
  - `GET /api/jobs/{id}` – fetch detailed job status including run/artifact paths.
  - `GET /api/jobs/{id}/logs` – return the captured log file contents when available.
  - `GET /api/jobs/{id}/artifacts` – describe generated JSON/log files for download integrations.
- Jobs execute synchronously inside a background thread using the same workflow as `graphgen/generate.py`. Metadata is stored in-memory (future work: persist to SQLite/Postgres).
- Start the service locally: `uvicorn graphgen.api.app:app --reload --port 8000`.

## Frontend

- Located beneath `webui_spa/` and built with Vite + React + TypeScript.
- The SPA layers include:
  - `services/` – thin Axios clients that map to the FastAPI routes.
  - `components/` – layout primitives, job table, status badges, and a job submission form.
  - `pages/` – dashboard, job detail view, submission flow, and a 404 catchall.
- Development commands:
  ```bash
  cd webui_spa
  npm install
  npm run dev
  ```
  The dev server proxies `/api` requests to `http://localhost:8000`.
- Production build: `npm run build` (outputs to `webui_spa/dist`). Static assets can be served via the FastAPI app or any CDN.

## Integration Notes

- Update `.env` or API client configuration (`VITE_API_BASE`) when deploying behind a reverse proxy.
- The download link in the job detail view (`/download?path=…`) expects a future endpoint to stream artifacts securely.
- Extend `JobManager` in `graphgen/api/jobs.py` if you need persistence, authentication, or multi-worker orchestration.
- CI hooks for linting/testing the SPA are not yet wired into GitHub Actions; add Node tooling to the workflows when ready.
