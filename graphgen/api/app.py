from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from graphgen.api.jobs import job_manager
from graphgen.api.configs import router as configs_router
from graphgen.api.resources import router as resources_router
from graphgen.api.settings import router as settings_router
from graphgen.api.schemas import (
    JobArtifactsResponse,
    JobCreateRequest,
    JobListResponse,
    JobLogResponse,
    JobResponse,
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="GraphGen API",
        version="0.1.0",
        description="FastAPI backend powering the GraphGen single-page application.",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["system"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok"}

    @api.post("/jobs", response_model=JobResponse, tags=["jobs"])
    async def create_job(payload: JobCreateRequest) -> JobResponse:
        record = await job_manager.enqueue(payload)
        return record.to_response()

    @api.get("/jobs", response_model=JobListResponse, tags=["jobs"])
    async def list_jobs() -> JobListResponse:
        records = await job_manager.list_responses()
        jobs = sorted(records.values(), key=lambda job: job.created_at, reverse=True)
        return JobListResponse(jobs=jobs)

    @api.get("/jobs/{job_id}", response_model=JobResponse, tags=["jobs"])
    async def get_job(job_id: str) -> JobResponse:
        record = await job_manager.job_response(job_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Job not found")
        return record

    @api.get("/jobs/{job_id}/logs", response_model=JobLogResponse, tags=["jobs"])
    async def get_job_logs(job_id: str) -> JobLogResponse:
        try:
            return await job_manager.read_log(job_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Job not found") from exc

    @api.get(
        "/jobs/{job_id}/artifacts", response_model=JobArtifactsResponse, tags=["jobs"]
    )
    async def get_job_artifacts(job_id: str) -> JobArtifactsResponse:
        try:
            return await job_manager.list_artifacts(job_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Job not found") from exc

    @api.get(
        "/jobs/{job_id}/artifacts/download",
        response_class=FileResponse,
        tags=["jobs"],
    )
    async def download_artifact(
        job_id: str,
        path: str = Query(
            ..., description="Relative path returned by the artifacts endpoint."
        ),
    ) -> FileResponse:
        try:
            target = await job_manager.resolve_artifact(job_id, path)
        except (KeyError, FileNotFoundError) as exc:
            raise HTTPException(status_code=404, detail="Artifact not found") from exc

        return FileResponse(target, filename=Path(target).name)

    app.include_router(api)
    app.include_router(configs_router)
    app.include_router(resources_router)
    app.include_router(settings_router)

    spa_dist = Path(__file__).resolve().parents[2] / "webui_spa" / "dist"
    if spa_dist.exists():
        app.mount("/", StaticFiles(directory=spa_dist, html=True), name="spa")

    return app


app = create_app()
