from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.config import get_settings
from backend.services.classifier_service import get_classifier_service
from backend.services.face_alignment import align_face
from backend.services.face_detector import get_face_detector
from backend.services.landmark_detector import get_landmark_detector
from backend.utils.image_utils import load_image_rgb

router = APIRouter(prefix="/api/classify", tags=["classify"])


class ClassifyResponse(BaseModel):
    category: str
    subtype: str
    category_confidence: float
    subtype_confidence: float


@router.get("/{upload_filename}", response_model=ClassifyResponse)
async def classify_image(upload_filename: str) -> ClassifyResponse:
    settings = get_settings()
    path = settings.upload_dir / upload_filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Upload not found.")

    image_rgb = load_image_rgb(path)
    face = get_face_detector().detect(image_rgb)
    if face is None:
        raise HTTPException(status_code=422, detail="No face detected in image.")

    mesh = get_landmark_detector().detect(image_rgb)
    aligned = align_face(image_rgb, face, mesh)
    result = get_classifier_service().classify(aligned, has_animal_face_landmarks=(mesh is None))

    return ClassifyResponse(
        category=result.category,
        subtype=result.subtype,
        category_confidence=result.category_confidence,
        subtype_confidence=result.subtype_confidence,
    )
