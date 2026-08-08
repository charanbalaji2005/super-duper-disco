"""
Thin orchestration layer over preprocessing/align_face.py — decides which eye
landmarks to use (InsightFace 5pt vs MediaPipe mesh) and returns the aligned
crop plus the transform's canonical size, so downstream steps (generation,
quality) all agree on coordinate space.
"""
from __future__ import annotations

import numpy as np

from backend.preprocessing.align_face import align_by_eyes
from backend.services.face_detector import DetectedFace
from backend.services.landmark_detector import LandmarkResult


def align_face(image_rgb: np.ndarray, face: DetectedFace, mesh: LandmarkResult | None) -> np.ndarray:
    if mesh is not None:
        left_eye, right_eye = mesh.left_eye, mesh.right_eye
    else:
        # InsightFace 5pt order: [left_eye, right_eye, nose, mouth_left, mouth_right]
        left_eye, right_eye = face.landmarks_5pt[0], face.landmarks_5pt[1]

    return align_by_eyes(image_rgb, left_eye, right_eye)
