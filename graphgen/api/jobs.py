from __future__ import annotations

import asyncio
import datetime as dt
import os
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

from graphgen.api.schemas import (
    ArtifactDescriptor,
    JobArtifactsResponse,
    JobCreateRequest,
    LLMSettings,
    JobLogResponse,
    JobResponse,
    JobStatus,
)
from graphgen.generate import save_config, set_working_dir
from graphgen.graphgen import GraphGen
from graphgen.utils import logger, set_logger


ENV_KEY_MAP = {
    "synthesizer_model": "SYNTHESIZER_MODEL",
    "synthesizer_base_url": "SYNTHESIZER_BASE_URL",
    "synthesizer_api_key": "SYNTHESIZER_API_KEY",
    "trainee_model": "TRAINEE_MODEL",
    "trainee_base_url": "TRAINEE_BASE_URL",
    "trainee_api_key": "TRAINEE_API_KEY",
    "tokenizer_model": "TOKENIZER_MODEL",
}

ENV_PATCH_LOCK = threading.Lock()


def _deep_merge(base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively merge dictionaries."""
    for key, value in updates.items():
        if (
            key in base
            and isinstance(base[key], dict)
            and isinstance(value, dict)
        ):
            base[key] = _deep_merge(dict(base[key]), value)
        else:
            base[key] = value
    return base


def _sanitize_llm_settings(settings: Optional[LLMSettings]) -> Dict[str, str]:
    if settings is None:
        return {}
    payload = {}
    for field_name, env_var in ENV_KEY_MAP.items():
        value = getattr(settings, field_name, None)
        if value is not None and value != "":
            payload[env_var] = value
    return payload


class _patched_env:  # pylint: disable=too-few-public-methods
    def __init__(self, updates: Dict[str, str]):
        self._updates = updates
        self._original: Dict[str, Optional[str]] = {}

    def __enter__(self):
        for key, value in self._updates.items():
            self._original[key] = os.environ.get(key)
            os.environ[key] = value

    def __exit__(self, exc_type, exc, tb):  # noqa: D401
        for key, original in self._original.items():
            if original is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = original
        return False


def _run_graphgen_job(
    config_path: Path,
    output_dir: Path,
    overrides: Dict[str, Any],
    llm_settings: Dict[str, str],
) -> Dict[str, Any]:
    """Execute the GraphGen pipeline synchronously."""
    with open(config_path, "r", encoding="utf-8") as fh:
        config = yaml.load(fh, Loader=yaml.FullLoader)

    if overrides:
        config = _deep_merge(config, overrides)

    unique_id = int(time.time())
    job_root = output_dir / "data" / "graphgen" / str(unique_id)
    set_working_dir(str(job_root))

    log_file = job_root / f"{unique_id}_{config['generate']['mode']}.log"
    set_logger(str(log_file), if_stream=True)
    logger.info("GraphGen job %s started with config %s", unique_id, config_path)

    with ENV_PATCH_LOCK:
        with _patched_env(llm_settings):
            graph_gen = GraphGen(unique_id=unique_id, working_dir=str(output_dir))

            # Execute the same steps as the CLI entrypoint.
            graph_gen.insert(
                read_config=config["read"],
                split_config=config["split"],
            )
            graph_gen.search(search_config=config["search"])

            if config.get("quiz_and_judge", {}).get("enabled"):
                graph_gen.quiz_and_judge(quiz_and_judge_config=config["quiz_and_judge"])

            graph_gen.generate(
                partition_config=config["partition"],
                generate_config=config["generate"],
            )

    save_config(str(job_root / "config.yaml"), config)
    logger.info("GraphGen job %s completed successfully.", unique_id)
    return {
        "run_path": str(job_root),
        "log_file": str(log_file),
        "unique_id": unique_id,
    }


@dataclass
class JobRecord:
    job_id: str
    config_path: Path
    output_dir: Path
    overrides: Dict[str, Any]
    status: JobStatus = JobStatus.queued
    created_at: dt.datetime = field(default_factory=lambda: dt.datetime.utcnow())
    updated_at: dt.datetime = field(default_factory=lambda: dt.datetime.utcnow())
    started_at: Optional[dt.datetime] = None
    completed_at: Optional[dt.datetime] = None
    log_file: Optional[Path] = None
    run_path: Optional[Path] = None
    error: Optional[str] = None
    llm_settings: Dict[str, str] = field(default_factory=dict)
    task: Optional[asyncio.Task] = None

    def to_response(self) -> JobResponse:
        return JobResponse(
            job_id=self.job_id,
            status=self.status,
            config_path=str(self.config_path),
            output_dir=str(self.output_dir),
            created_at=self.created_at,
            updated_at=self.updated_at,
            started_at=self.started_at,
            completed_at=self.completed_at,
            log_file=str(self.log_file) if self.log_file else None,
            run_path=str(self.run_path) if self.run_path else None,
            error=self.error,
            llm_settings=LLMSettings(**self.llm_settings) if self.llm_settings else None,
        )


class JobManager:
    """In-memory registry for background GraphGen jobs."""

    def __init__(self) -> None:
        self._jobs: Dict[str, JobRecord] = {}
        self._lock = asyncio.Lock()
        self._thread_lock = threading.Lock()

    async def enqueue(self, request: JobCreateRequest) -> JobRecord:
        config_path = Path(request.config_path).expanduser().resolve()
        if not config_path.is_file():
            raise FileNotFoundError(config_path)

        output_dir = (
            Path(request.output_dir).expanduser().resolve()
            if request.output_dir
            else Path(config_path).parents[1] / "cache"
        )
        output_dir.mkdir(parents=True, exist_ok=True)

        job_id = uuid.uuid4().hex
        record = JobRecord(
            job_id=job_id,
            config_path=config_path,
            output_dir=output_dir,
            overrides=request.overrides,
            llm_settings=_sanitize_llm_settings(request.llm_settings),
        )

        async with self._lock:
            self._jobs[job_id] = record

        loop = asyncio.get_running_loop()
        record.task = loop.create_task(self._run_job(record))
        return record

    async def _run_job(self, record: JobRecord) -> None:
        record.status = JobStatus.running
        record.started_at = dt.datetime.utcnow()
        record.updated_at = record.started_at

        try:
            result = await asyncio.to_thread(
                _run_graphgen_job,
                record.config_path,
                record.output_dir,
                record.overrides,
                record.llm_settings,
            )
            record.run_path = Path(result["run_path"])
            record.log_file = Path(result["log_file"])
            record.status = JobStatus.succeeded
        except Exception as exc:  # pylint: disable=broad-except
            logger.exception("Job %s failed: %s", record.job_id, exc)
            record.error = str(exc)
            record.status = JobStatus.failed
        finally:
            record.completed_at = dt.datetime.utcnow()
            record.updated_at = record.completed_at

    async def list_jobs(self) -> Dict[str, JobRecord]:
        async with self._lock:
            return dict(self._jobs)

    async def get_job(self, job_id: str) -> Optional[JobRecord]:
        async with self._lock:
            return self._jobs.get(job_id)

    async def job_response(self, job_id: str) -> Optional[JobResponse]:
        record = await self.get_job(job_id)
        return record.to_response() if record else None

    async def list_responses(self) -> Dict[str, JobResponse]:
        records = await self.list_jobs()
        return {job_id: rec.to_response() for job_id, rec in records.items()}

    async def read_log(self, job_id: str) -> JobLogResponse:
        record = await self.get_job(job_id)
        if record is None:
            raise KeyError(job_id)
        content = ""
        if record.log_file and record.log_file.is_file():
            content = record.log_file.read_text(encoding="utf-8")
        return JobLogResponse(
            job_id=job_id,
            log_file=str(record.log_file) if record.log_file else None,
            content=content,
        )

    async def list_artifacts(self, job_id: str) -> JobArtifactsResponse:
        record = await self.get_job(job_id)
        if record is None:
            raise KeyError(job_id)
        artifacts: list[ArtifactDescriptor] = []
        if record.run_path and record.run_path.exists():
            for path in record.run_path.iterdir():
                if path.is_file():
                    stat = path.stat()
                    artifacts.append(
                        ArtifactDescriptor(
                            path=str(path.relative_to(record.run_path)),
                            size_bytes=stat.st_size,
                            modified_at=dt.datetime.utcfromtimestamp(stat.st_mtime),
                        )
                    )
        return JobArtifactsResponse(job_id=job_id, artifacts=artifacts)

    async def resolve_artifact(self, job_id: str, relative_path: str) -> Path:
        record = await self.get_job(job_id)
        if record is None or record.run_path is None:
            raise KeyError(job_id)

        candidate = record.run_path.joinpath(relative_path).resolve()
        if not candidate.is_file() or not str(candidate).startswith(str(record.run_path.resolve())):
            raise FileNotFoundError(relative_path)
        return candidate


job_manager = JobManager()
