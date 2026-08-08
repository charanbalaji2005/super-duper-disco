from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select

from backend.database.database import AsyncSessionLocal
from backend.database.models import GeneratedImage
from backend.services.zip_service import build_zip

router = APIRouter(prefix="/api/download", tags=["download"])


@router.get("/{request_id}/{expression}")
async def download_single(request_id: str, expression: str) -> FileResponse:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(GeneratedImage).where(
                GeneratedImage.request_id == request_id, GeneratedImage.expression == expression
            )
        )
        row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Image not found.")
    return FileResponse(row.file_path, media_type="image/png", filename=f"{expression}.png")


@router.get("/{request_id}/zip")
async def download_zip(request_id: str) -> StreamingResponse:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(GeneratedImage).where(GeneratedImage.request_id == request_id))
        rows = result.scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="No images found for that request_id.")

    from pathlib import Path

    image_paths = {f"{r.expression}.png": Path(r.file_path) for r in rows}
    buffer = build_zip(image_paths)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={request_id}.zip"},
    )
