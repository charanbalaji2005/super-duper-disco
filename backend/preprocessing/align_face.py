from __future__ import annotations

import cv2
import numpy as np

from backend.config import get_app_config


def align_by_eyes(
    arr: np.ndarray,
    left_eye: tuple[float, float],
    right_eye: tuple[float, float],
    target_size: int | None = None,
) -> np.ndarray:
    """
    Rotate/scale/translate the image so the eyes land at fixed canonical
    positions. This is the same idea used by InsightFace/ArcFace alignment
    and by dlib's `align_face`: a similarity transform estimated from two
    points is enough to normalize in-plane rotation and scale.
    """
    cfg = get_app_config().get("alignment", {})
    size = target_size or cfg.get("target_size", 512)
    left_ratio = cfg.get("left_eye_ratio", [0.35, 0.35])
    right_ratio = cfg.get("right_eye_ratio", [0.65, 0.35])

    dst_left = np.array([left_ratio[0] * size, left_ratio[1] * size], dtype=np.float32)
    dst_right = np.array([right_ratio[0] * size, right_ratio[1] * size], dtype=np.float32)

    src = np.array([left_eye, right_eye], dtype=np.float32)
    dst = np.array([dst_left, dst_right], dtype=np.float32)


    transform, _ = cv2.estimateAffinePartial2D(src.reshape(1, 2, 2)[0], dst)
    if transform is None:

        return cv2.resize(arr, (size, size), interpolation=cv2.INTER_AREA)

    aligned = cv2.warpAffine(arr, transform, (size, size), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return aligned
