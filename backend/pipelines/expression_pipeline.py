"""
Top-level orchestration: upload -> detect -> classify -> align -> generate ->
quality-check -> persist. human_pipeline.py / animal_pipeline.py are thin
wrappers that call into this with subject-specific defaults.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.config import get_settings
from backend.services.classifier_service import ClassificationResult, get_classifier_service
from backend.services.face_alignment import align_face
from backend.services.face_detector import DetectedFace, get_face_detector
from backend.services.img2img_generator import ALL_EXPRESSIONS, GenerationResult, get_generator
from backend.services.landmark_detector import get_landmark_detector
from backend.services.quality_checker import QualityReport, get_quality_checker
from backend.utils.helpers import new_id, timed
from backend.utils.logger import logger


@dataclass
class PipelineOutput:
    request_id: str
    classification: ClassificationResult
    aligned_face: np.ndarray
    generations: list[tuple[GenerationResult, QualityReport]]
    output_paths: dict[str, Path]


MAX_REGENERATE_ATTEMPTS = 0


def run_expression_pipeline(
    image_rgb: np.ndarray,
    expressions: list[str] | None = None,
    lora_name: str | None = None,
    lora_weight: float | None = None,
    callback=None,
) -> PipelineOutput:
    """
    Runs the full pipeline. If `expressions` is None or empty, generates all
    7 supported expressions (happy, sad, angry, surprise, fear, disgust,
    neutral) in one pass from the same aligned source face.
    """
    expressions = expressions or ALL_EXPRESSIONS
    settings = get_settings()
    request_id = new_id("req")

    detector = get_face_detector()
    landmarker = get_landmark_detector()
    classifier = get_classifier_service()
    generator = get_generator()
    quality = get_quality_checker()

    with timed("face_detection"):
        face: DetectedFace | None = detector.detect(image_rgb)
    if face is None:
        raise ValueError("No face detected in the uploaded image.")

    with timed("landmark_detection"):
        mesh = landmarker.detect(image_rgb)

    with timed("face_alignment"):
        aligned = align_face(image_rgb, face, mesh)

    with timed("classification"):
        classification = classifier.classify(aligned, has_animal_face_landmarks=(mesh is None))

    logger.info(
        "[{}] classified as {} / {} (conf={:.2f}/{:.2f}), generating {} expression(s){}",
        request_id,
        classification.category,
        classification.subtype,
        classification.category_confidence,
        classification.subtype_confidence,
        len(expressions),
        f" with LoRA '{lora_name}'" if lora_name else "",
    )



    if lora_name is not None:
        generator.set_lora(lora_name, weight=lora_weight if lora_weight is not None else 0.8)

    generations: list[tuple[GenerationResult, QualityReport]] = []
    output_paths: dict[str, Path] = {}
    out_dir = settings.output_dir / request_id
    out_dir.mkdir(parents=True, exist_ok=True)

    for idx, expression in enumerate(expressions):
        expr_callback = None
        if callback:
            expr_callback = lambda step, timestep, latents, i=idx, label=expression: callback(i, len(expressions), label, step)
        result, report = _generate_with_retries(
            generator, quality, aligned, expression, classification.category, face.embedding, callback=expr_callback
        )
        path = out_dir / f"{expression}.png"
        result.image.save(path)
        output_paths[expression] = path
        generations.append((result, report))

    return PipelineOutput(
        request_id=request_id,
        classification=classification,
        aligned_face=aligned,
        generations=generations,
        output_paths=output_paths,
    )


def _generate_with_retries(
    generator, quality, aligned_face, expression, subject_category, source_embedding, callback=None
) -> tuple[GenerationResult, QualityReport]:
    last_result, last_report = None, None
    for attempt in range(MAX_REGENERATE_ATTEMPTS + 1):
        with timed(f"generate:{expression}:attempt{attempt}"):
            result = generator.generate(aligned_face, expression, subject_category, seed=None, callback=callback)
            gen_rgb = np.array(result.image.convert("RGB"))
            report = quality.check(aligned_face, gen_rgb, source_embedding=source_embedding)
        last_result, last_report = result, report
        if report.passed:
            return result, report
        logger.warning(
            "Quality check failed for '{}' (attempt {}): {}", expression, attempt, report.failure_reasons
        )
    return last_result, last_report
