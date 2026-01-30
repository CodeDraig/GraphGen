from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter

from graphgen.api.schemas import InputSample, InputSampleList


RESOURCES_ROOT = Path(__file__).resolve().parents[2] / "resources" / "input_examples"

router = APIRouter(prefix="/api/resources", tags=["resources"])


@router.get("/inputs", response_model=InputSampleList)
async def list_input_examples() -> InputSampleList:
    inputs = []
    if RESOURCES_ROOT.exists():
        for path in sorted(RESOURCES_ROOT.glob("*")):
            if path.is_file():
                stat = path.stat()
                inputs.append(
                    InputSample(
                        name=path.name,
                        path=str(path),
                        size_bytes=stat.st_size if stat else None,
                    )
                )
    return InputSampleList(inputs=inputs)
