from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from backend.services.img2img_generator import get_generator

router = APIRouter(prefix="/api/lora", tags=["lora"])


class LoraListResponse(BaseModel):
    available: list[str]
    active: str | None


@router.get("", response_model=LoraListResponse)
async def list_loras() -> LoraListResponse:
    generator = get_generator()
    return LoraListResponse(
        available=generator.list_available_loras(),
        active=generator._loaded_lora_name,
    )
