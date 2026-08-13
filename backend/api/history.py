from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.crud import get_history
from backend.database.database import get_db

router = APIRouter(prefix="/api/history", tags=["history"])


class HistoryImageOut(BaseModel):
    expression: str
    passed_quality: bool
    download_url: str
    failure_reasons: list[str] = []


class HistoryItemOut(BaseModel):
    id: str
    created_at: str
    category: str
    subtype: str
    requested_expressions: list[str]
    lora_used: str | None
    outputs: list[HistoryImageOut]


@router.get("", response_model=list[HistoryItemOut])
async def list_history(limit: int = 50, db: AsyncSession = Depends(get_db)) -> list[HistoryItemOut]:
    records = await get_history(db, limit=limit)
    return [
        HistoryItemOut(
            id=r.id,
            created_at=r.created_at.isoformat(),
            category=r.category,
            subtype=r.subtype,
            requested_expressions=r.requested_expressions,
            lora_used=r.lora_used,
            outputs=[
                HistoryImageOut(
                    expression=o.expression,
                    passed_quality=o.passed_quality,
                    download_url=f"/api/download/{r.id}/{o.expression}",
                    failure_reasons=o.failure_reasons or [],
                )
                for o in r.outputs
            ],
        )
        for r in records
    ]
