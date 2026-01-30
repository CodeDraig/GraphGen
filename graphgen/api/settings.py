from __future__ import annotations

import os

from fastapi import APIRouter

from graphgen.api.schemas import LLMSettings, LLMSettingsResponse


router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/llm", response_model=LLMSettingsResponse)
async def get_llm_settings() -> LLMSettingsResponse:
    return LLMSettingsResponse(
        defaults=LLMSettings(
            synthesizer_model=os.getenv("SYNTHESIZER_MODEL"),
            synthesizer_base_url=os.getenv("SYNTHESIZER_BASE_URL"),
            synthesizer_api_key=os.getenv("SYNTHESIZER_API_KEY"),
            trainee_model=os.getenv("TRAINEE_MODEL"),
            trainee_base_url=os.getenv("TRAINEE_BASE_URL"),
            trainee_api_key=os.getenv("TRAINEE_API_KEY"),
            tokenizer_model=os.getenv("TOKENIZER_MODEL"),
        )
    )
