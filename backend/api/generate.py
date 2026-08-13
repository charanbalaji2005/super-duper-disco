from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_settings
from backend.database.crud import save_generation_request
from backend.database.database import get_db
from backend.pipelines.animal_pipeline import run_animal_pipeline
from backend.pipelines.human_pipeline import run_human_pipeline
from backend.services.classifier_service import get_classifier_service
from backend.services.face_alignment import align_face
from backend.services.face_detector import get_face_detector
from backend.services.img2img_generator import ALL_EXPRESSIONS
from backend.services.landmark_detector import get_landmark_detector
from backend.utils.image_utils import load_image_rgb
from backend.utils.logger import logger
from backend.utils.helpers import new_id
from backend.utils import progress_tracker
from backend.utils.validators import validate_expressions

router = APIRouter(prefix="/api/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    upload_filename: str
    expressions: list[str] = Field(
        default_factory=list,
        description="Subset of [happy, sad, angry, surprise, fear, disgust, neutral]. "
        "Leave empty to generate all 7 at once.",
    )
    lora_name: str | None = Field(
        default=None, description="Name of a trained LoRA under models/loras/ (see GET /api/lora)."
    )
    lora_weight: float | None = Field(default=None, ge=0.0, le=2.0, description="LoRA fusion strength, default 0.8.")
    request_id: str | None = Field(default=None, description="Optional custom client-generated request ID for progress tracking.")


class GeneratedImageOut(BaseModel):
    expression: str
    passed_quality: bool
    failure_reasons: list[str]
    download_url: str


class GenerateResponse(BaseModel):
    request_id: str
    category: str
    subtype: str
    lora_used: str | None
    images: list[GeneratedImageOut]


@router.get("/progress/{request_id}", response_model=progress_tracker.ProgressState)
async def get_generation_progress(request_id: str):
    state = progress_tracker.get_progress(request_id)
    if state is None:
        return progress_tracker.ProgressState(
            request_id=request_id,
            status="idle",
            progress_percent=0,
            current_step=0,
            total_steps=13,
            current_expression="",
            total_expressions=1,
        )
    return state


@router.post("/cancel/{request_id}")
async def cancel_generation(request_id: str):
    progress_tracker.cancel_request(request_id)
    return {"status": "cancelled", "request_id": request_id}


@router.post("", response_model=GenerateResponse)
async def generate_expressions(payload: GenerateRequest, db: AsyncSession = Depends(get_db)) -> GenerateResponse:
    settings = get_settings()

    expressions = validate_expressions(payload.expressions) if payload.expressions else list(ALL_EXPRESSIONS)

    path = settings.upload_dir / payload.upload_filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Upload not found.")

    image_rgb = load_image_rgb(path)

    face = get_face_detector().detect(image_rgb)
    if face is None:
        raise HTTPException(status_code=422, detail="No face detected in image.")
    mesh = get_landmark_detector().detect(image_rgb)
    aligned = align_face(image_rgb, face, mesh)
    pre_classification = get_classifier_service().classify(aligned, has_animal_face_landmarks=(mesh is None))

    request_id = payload.request_id or new_id("req")
    total_steps = settings.generation_steps

    progress_tracker.set_progress(
        request_id,
        progress_tracker.ProgressState(
            request_id=request_id,
            status="idle",
            progress_percent=0,
            current_step=0,
            total_steps=total_steps,
            current_expression="",
            total_expressions=len(expressions),
        ),
    )

    def progress_callback(expr_idx: int, total_exprs: int, expression: str, step: int):
        if progress_tracker.is_cancelled(request_id):
            raise RuntimeError("Generation cancelled by user.")
        completed_work = (expr_idx * total_steps) + step
        total_work = total_exprs * total_steps
        percent = int((completed_work / total_work) * 100) if total_work > 0 else 0
        progress_tracker.update_progress_percent(
            request_id,
            percent,
            step,
            total_steps,
            expression,
            total_exprs,
        )

    try:
        if pre_classification.category == "animal":
            output = await run_in_threadpool(
                run_animal_pipeline,
                image_rgb,
                expressions,
                lora_name=payload.lora_name,
                lora_weight=payload.lora_weight,
                callback=progress_callback,
            )
        else:
            output = await run_in_threadpool(
                run_human_pipeline,
                image_rgb,
                expressions,
                lora_name=payload.lora_name,
                lora_weight=payload.lora_weight,
                callback=progress_callback,
            )
        

        output.request_id = request_id
    except ValueError as e:
        progress_tracker.set_progress(
            request_id,
            progress_tracker.ProgressState(
                request_id=request_id,
                status="failed",
                progress_percent=0,
                current_step=0,
                total_steps=total_steps,
                current_expression="",
                total_expressions=len(expressions),
            ),
        )
        raise HTTPException(status_code=422, detail=str(e)) from e
    except FileNotFoundError as e:
        progress_tracker.set_progress(
            request_id,
            progress_tracker.ProgressState(
                request_id=request_id,
                status="failed",
                progress_percent=0,
                current_step=0,
                total_steps=total_steps,
                current_expression="",
                total_expressions=len(expressions),
            ),
        )
        logger.error(str(e))
        raise HTTPException(status_code=503, detail=str(e)) from e

    record = await save_generation_request(
        db, payload.upload_filename, expressions, output, lora_used=payload.lora_name
    )

    images_out = [
        GeneratedImageOut(
            expression=result.expression,
            passed_quality=report.passed,
            failure_reasons=report.failure_reasons,
            download_url=f"/api/download/{output.request_id}/{result.expression}",
        )
        for result, report in output.generations
    ]

    progress_tracker.set_progress(
        request_id,
        progress_tracker.ProgressState(
            request_id=request_id,
            status="done",
            progress_percent=100,
            current_step=total_steps,
            total_steps=total_steps,
            current_expression=expressions[-1],
            total_expressions=len(expressions),
        ),
    )

    return GenerateResponse(
        request_id=output.request_id,
        category=output.classification.category,
        subtype=output.classification.subtype,
        lora_used=payload.lora_name,
        images=images_out,
    )
