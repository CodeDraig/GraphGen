from __future__ import annotations

import datetime as dt
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class JobCreateRequest(BaseModel):
    config_path: str = Field(
        ...,
        description="Absolute or repository-relative path to a GraphGen YAML configuration.",
    )
    output_dir: Optional[str] = Field(
        None,
        description="Optional output directory. Defaults to GraphGen cache directory when omitted.",
    )
    overrides: Dict[str, Any] = Field(
        default_factory=dict,
        description="Partial configuration overrides merged onto the loaded YAML.",
    )
    llm_settings: Optional["LLMSettings"] = Field(
        default=None,
        description="Optional overrides for tokenizer, synthesizer, and trainee LLM endpoints.",
    )


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    config_path: str
    output_dir: str
    created_at: dt.datetime
    updated_at: dt.datetime
    started_at: Optional[dt.datetime] = None
    completed_at: Optional[dt.datetime] = None
    log_file: Optional[str] = None
    run_path: Optional[str] = None
    error: Optional[str] = None
    llm_settings: Optional["LLMSettings"] = None


class JobListResponse(BaseModel):
    jobs: List[JobResponse]


class JobLogResponse(BaseModel):
    job_id: str
    log_file: Optional[str]
    content: str = ""


class ArtifactDescriptor(BaseModel):
    path: str
    size_bytes: int
    modified_at: dt.datetime


class JobArtifactsResponse(BaseModel):
    job_id: str
    artifacts: List[ArtifactDescriptor]


class ConfigDescriptor(BaseModel):
    id: str
    name: str
    path: str
    mode: Optional[str] = None
    description: Optional[str] = None


class ConfigListResponse(BaseModel):
    configs: List[ConfigDescriptor]
    default: Optional[str] = None


class ConfigDetailResponse(BaseModel):
    id: str
    name: str
    path: str
    mode: Optional[str] = None
    config: Dict[str, Any]


class InputSample(BaseModel):
    name: str
    path: str
    size_bytes: Optional[int] = None


class InputSampleList(BaseModel):
    inputs: List[InputSample]


class LLMSettings(BaseModel):
    synthesizer_model: Optional[str] = None
    synthesizer_base_url: Optional[str] = None
    synthesizer_api_key: Optional[str] = None
    trainee_model: Optional[str] = None
    trainee_base_url: Optional[str] = None
    trainee_api_key: Optional[str] = None
    tokenizer_model: Optional[str] = None


class LLMSettingsResponse(BaseModel):
    defaults: LLMSettings


JobCreateRequest.model_rebuild()
JobResponse.model_rebuild()
