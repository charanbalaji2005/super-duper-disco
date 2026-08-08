from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from backend.database.database import AsyncSessionLocal
from backend.database.models import GeneratedImage

router = APIRouter(prefix="/api/quality", tags=["quality"])


class QualityOut(BaseModel):
    expression: str
    passed_quality: bool
    failure_reasons: list[str]


@router.get("/{request_id}", response_model=list[QualityOut])
async def get_quality_report(request_id: str) -> list[QualityOut]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(GeneratedImage).where(GeneratedImage.request_id == request_id))
        rows = result.scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="No generation found for that request_id.")
    return [QualityOut(expression=r.expression, passed_quality=r.passed_quality, failure_reasons=r.failure_reasons) for r in rows]
