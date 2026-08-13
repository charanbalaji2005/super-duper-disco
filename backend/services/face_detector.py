"""
Face detection service.

Primary: InsightFace (RetinaFace detector bundled in the `buffalo_l` pack) —
gives bbox + 5-point landmarks + a face embedding in one pass, which is what
we need for both alignment and later identity-similarity quality checks.

Fallback: MediaPipe Face Detection, used if InsightFace models aren't
downloaded yet or if InsightFace throws (e.g. no compatible ONNX runtime).
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from backend.config import get_settings
from backend.utils.logger import logger


@dataclass
class DetectedFace:
    bbox: tuple[int, int, int, int]
    landmarks_5pt: list[tuple[float, float]]
    confidence: float
    embedding: np.ndarray | None = None


class FaceDetector:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._insightface_app = None
        self._mediapipe_detector = None

    def _get_insightface(self):
        if self._insightface_app is None:
            try:
                from insightface.app import FaceAnalysis

                app = FaceAnalysis(
                    name="buffalo_l",
                    root=self.settings.insightface_model_root,
                    providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
                )
                app.prepare(ctx_id=0 if self.settings.device == "cuda" else -1, det_size=(640, 640))
                self._insightface_app = app
                logger.info("InsightFace FaceAnalysis loaded.")
            except Exception as e:
                logger.warning("InsightFace unavailable ({}), will use MediaPipe fallback.", e)
                self._insightface_app = False
        return self._insightface_app

    def _get_mediapipe(self):
        if self._mediapipe_detector is None:
            import mediapipe as mp

            self._mediapipe_detector = mp.solutions.face_detection.FaceDetection(
                model_selection=1, min_detection_confidence=0.6
            )
        return self._mediapipe_detector

    def detect(self, image_rgb: np.ndarray) -> DetectedFace | None:
        app = self._get_insightface()
        if app:
            faces = app.get(image_rgb[:, :, ::-1])
            if not faces:
                return None

            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            x1, y1, x2, y2 = [int(v) for v in face.bbox]
            kps = [(float(x), float(y)) for x, y in face.kps]
            return DetectedFace(
                bbox=(x1, y1, x2, y2),
                landmarks_5pt=kps,
                confidence=float(face.det_score),
                embedding=face.normed_embedding,
            )


        detector = self._get_mediapipe()
        results = detector.process(image_rgb)
        if not results.detections:
            return None
        det = max(results.detections, key=lambda d: d.score[0])
        h, w = image_rgb.shape[:2]
        box = det.location_data.relative_bounding_box
        x1, y1 = int(box.xmin * w), int(box.ymin * h)
        x2, y2 = int((box.xmin + box.width) * w), int((box.ymin + box.height) * h)

        kp = det.location_data.relative_keypoints

        landmarks = [(p.x * w, p.y * h) for p in kp[:5]]

        return DetectedFace(
            bbox=(x1, y1, x2, y2),
            landmarks_5pt=landmarks,
            confidence=float(det.score[0]),
            embedding=None,
        )

    def cosine_similarity(self, emb_a: np.ndarray | None, emb_b: np.ndarray | None) -> float | None:
        """Identity-similarity between two face embeddings, used by quality_checker."""
        if emb_a is None or emb_b is None:
            return None
        a, b = emb_a / np.linalg.norm(emb_a), emb_b / np.linalg.norm(emb_b)
        return float(np.dot(a, b))


@lru_cache
def get_face_detector() -> FaceDetector:
    return FaceDetector()
