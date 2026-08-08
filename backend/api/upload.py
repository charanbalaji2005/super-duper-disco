from __future__ import annotations

from fastapi import APIRouter, UploadFile
from pydantic import BaseModel

from backend.config import get_settings
from backend.utils.helpers import new_id
from backend.utils.validators import validate_upload

router = APIRouter(prefix="/api/upload", tags=["upload"])


class UploadResponse(BaseModel):
    upload_id: str
    filename: str
    size_bytes: int


@router.post("", response_model=UploadResponse)
async def upload_image(file: UploadFile) -> UploadResponse:
    data = await validate_upload(file)
    settings = get_settings()

    upload_id = new_id("up")
    dest = settings.upload_dir / f"{upload_id}_{file.filename}"
    dest.write_bytes(data)

    return UploadResponse(upload_id=upload_id, filename=dest.name, size_bytes=len(data))
