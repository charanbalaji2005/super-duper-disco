from __future__ import annotations

from fastapi import HTTPException, UploadFile

from backend.config import get_settings

import io
from pathlib import Path
from PIL import Image

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/pjpeg", "image/x-png", "application/octet-stream"
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VALID_EXPRESSIONS = {"happy", "sad", "angry", "surprise", "fear", "disgust", "neutral"}


async def validate_upload(file: UploadFile) -> bytes:
    settings = get_settings()
    ext = Path(file.filename or "").suffix.lower()

    if file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file.filename}'. Please upload a JPG, PNG, or WebP image.",
        )

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {settings.max_upload_mb}MB.",
        )

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Corrupted or invalid image file.")

    return data


def validate_expressions(expressions: list[str]) -> list[str]:
    if not expressions:
        raise HTTPException(status_code=400, detail="Select at least one expression.")
    invalid = [e for e in expressions if e.lower() not in VALID_EXPRESSIONS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid expression(s): {invalid}. Valid options: {sorted(VALID_EXPRESSIONS)}",
        )
    return [e.lower() for e in expressions]
