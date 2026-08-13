"""
Post-generation quality gate. Every generated image passes through here
before being shown/returned to the user; failures are flagged (and can
trigger an automatic regeneration by the caller in expression_pipeline.py).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import imagehash
import numpy as np
from PIL import Image

from backend.config import get_app_config
from backend.services.face_detector import get_face_detector
from backend.utils.image_utils import laplacian_blur_variance
from backend.utils.logger import logger


@dataclass
class QualityReport:
    passed: bool
    face_detected: bool
    face_confidence: float | None = None
    blur_variance: float | None = None
    identity_similarity: float | None = None
    is_near_duplicate: bool = False
    failure_reasons: list[str] = field(default_factory=list)


class QualityChecker:
    def __init__(self) -> None:
        self.cfg = get_app_config().get("quality", {})
        self.detector = get_face_detector()

    def check(
        self,
        source_rgb: np.ndarray,
        generated_rgb: np.ndarray,
        source_embedding: np.ndarray | None = None,
    ) -> QualityReport:
        reasons: list[str] = []


        face = self.detector.detect(generated_rgb)
        if face is None:
            return QualityReport(
                passed=False, face_detected=False, failure_reasons=["No face detected in generated output."]
            )

        if face.confidence < self.cfg.get("min_face_confidence", 0.8):
            reasons.append(f"Low face confidence: {face.confidence:.2f}")


        blur_var = laplacian_blur_variance(generated_rgb)
        if blur_var < self.cfg.get("max_blur_variance_reject_below", 80.0):
            reasons.append(f"Image too blurry (variance={blur_var:.1f})")


        identity_sim = None
        if source_embedding is not None and face.embedding is not None:
            identity_sim = self.detector.cosine_similarity(source_embedding, face.embedding)
            min_sim = self.cfg.get("min_identity_similarity", 0.55)
            if identity_sim is not None and identity_sim < min_sim:
                reasons.append(f"Identity drifted too far (similarity={identity_sim:.2f} < {min_sim})")


        src_hash = imagehash.phash(Image.fromarray(source_rgb))
        gen_hash = imagehash.phash(Image.fromarray(generated_rgb))
        hash_distance = src_hash - gen_hash
        is_dup = hash_distance <= self.cfg.get("reject_duplicate_hash_distance", 4)
        if is_dup:
            reasons.append(f"Output nearly identical to input (hash distance={hash_distance})")

        passed = len(reasons) == 0
        if not passed:
            logger.warning("Quality check failed: {}", reasons)

        return QualityReport(
            passed=passed,
            face_detected=True,
            face_confidence=face.confidence,
            blur_variance=blur_var,
            identity_similarity=identity_sim,
            is_near_duplicate=is_dup,
            failure_reasons=reasons,
        )


def get_quality_checker() -> QualityChecker:
    return QualityChecker()
