from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import yaml
from fastapi import APIRouter, HTTPException

from graphgen.api.schemas import (
    ConfigDetailResponse,
    ConfigDescriptor,
    ConfigListResponse,
)


CONFIG_ROOT = Path(__file__).resolve().parents[2] / "graphgen" / "configs"

router = APIRouter(prefix="/api/configs", tags=["configs"])


def _discover_configs() -> List[Path]:
    if not CONFIG_ROOT.exists():
        return []
    return sorted(
        [path for path in CONFIG_ROOT.glob("*.yaml") if path.is_file()],
        key=lambda p: p.name,
    )


def _slug_from_path(path: Path) -> str:
    stem = path.stem
    if stem.endswith("_config"):
        stem = stem[: -len("_config")]
    return stem


def _display_name(slug: str) -> str:
    return slug.replace("_", " ").title()


def _load_yaml(path: Path) -> Dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.load(handle, Loader=yaml.FullLoader)


@router.get("", response_model=ConfigListResponse)
async def list_configs() -> ConfigListResponse:
    configs = []
    for path in _discover_configs():
        slug = _slug_from_path(path)
        try:
            data = _load_yaml(path)
        except yaml.YAMLError:
            data = {}
        mode = None
        if isinstance(data, dict):
            generate = data.get("generate") if isinstance(data, dict) else None
            if isinstance(generate, dict):
                mode = str(generate.get("mode")) if "mode" in generate else None
        configs.append(
            ConfigDescriptor(
                id=slug,
                name=_display_name(slug),
                path=str(path),
                mode=mode,
                description=f"GraphGen preset ({mode})" if mode else None,
            )
        )

    default = None
    for descriptor in configs:
        if descriptor.id == "atomic":
            default = descriptor.id
            break
    if default is None and configs:
        default = configs[0].id

    return ConfigListResponse(configs=configs, default=default)


@router.get("/{config_id}", response_model=ConfigDetailResponse)
async def get_config(config_id: str) -> ConfigDetailResponse:
    for path in _discover_configs():
        slug = _slug_from_path(path)
        if slug == config_id:
            data = _load_yaml(path)
            generate = data.get("generate") if isinstance(data, dict) else None
            mode = None
            if isinstance(generate, dict):
                mode = str(generate.get("mode")) if "mode" in generate else None
            return ConfigDetailResponse(
                id=slug,
                name=_display_name(slug),
                path=str(path),
                mode=mode,
                config=data,
            )
    raise HTTPException(status_code=404, detail="Configuration not found")
