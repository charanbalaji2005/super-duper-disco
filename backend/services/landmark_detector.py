"""
Dense landmark detection (468 points) via MediaPipe Face Mesh.

Used for: the "landmark overlay" UI preview, tighter face cropping, and a
quality signal (are eyes/nose/mouth self-consistent, i.e. no double-face
artifacts after generation).
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import numpy as np


@dataclass
class LandmarkResult:
    points: list[tuple[float, float]]
    left_eye: tuple[float, float]
    right_eye: tuple[float, float]
    mouth_center: tuple[float, float]
    score: float



_LEFT_EYE_IDX = 33
_RIGHT_EYE_IDX = 263
_MOUTH_LEFT_IDX = 61
_MOUTH_RIGHT_IDX = 291


class LandmarkDetector:
    def __init__(self) -> None:
        self._mesh = None

    def _get_mesh(self):
        if self._mesh is None:
            import mediapipe as mp

            self._mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
            )
        return self._mesh

    def detect(self, image_rgb: np.ndarray) -> LandmarkResult | None:
        mesh = self._get_mesh()
        h, w = image_rgb.shape[:2]
        result = mesh.process(image_rgb)
        if not result.multi_face_landmarks:
            return None

        lm = result.multi_face_landmarks[0].landmark
        points = [(p.x * w, p.y * h) for p in lm]

        mouth_l = points[_MOUTH_LEFT_IDX]
        mouth_r = points[_MOUTH_RIGHT_IDX]
        mouth_center = ((mouth_l[0] + mouth_r[0]) / 2, (mouth_l[1] + mouth_r[1]) / 2)

        return LandmarkResult(
            points=points,
            left_eye=points[_LEFT_EYE_IDX],
            right_eye=points[_RIGHT_EYE_IDX],
            mouth_center=mouth_center,
            score=1.0,
        )


@lru_cache
def get_landmark_detector() -> LandmarkDetector:
    return LandmarkDetector()
