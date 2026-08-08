from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.config import get_settings
from backend.services.face_detector import get_face_detector
from backend.utils.image_utils import load_image_rgb

router = APIRouter(prefix="/api/detect", tags=["detect"])


class DetectResponse(BaseModel):
    face_found: bool
    bbox: tuple[int, int, int, int] | None = None
    confidence: float | None = None


@router.get("/{upload_filename}", response_model=DetectResponse)
async def detect_face(upload_filename: str) -> DetectResponse:
    settings = get_settings()
    path = settings.upload_dir / upload_filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Upload not found.")

    image_rgb = load_image_rgb(path)
    face = get_face_detector().detect(image_rgb)
    if face is None:
        return DetectResponse(face_found=False)
    return DetectResponse(face_found=True, bbox=face.bbox, confidence=face.confidence)
