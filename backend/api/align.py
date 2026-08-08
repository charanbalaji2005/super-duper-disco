from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.config import get_settings
from backend.services.face_alignment import align_face
from backend.services.face_detector import get_face_detector
from backend.services.landmark_detector import get_landmark_detector
from backend.utils.image_utils import load_image_rgb, save_rgb

router = APIRouter(prefix="/api/align", tags=["align"])


@router.get("/{upload_filename}")
async def get_aligned_preview(upload_filename: str) -> FileResponse:
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

    out_path = settings.temp_dir / f"aligned_{upload_filename}.png"
    save_rgb(aligned, out_path)
    return FileResponse(out_path, media_type="image/png")
