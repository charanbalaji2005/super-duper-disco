from __future__ import annotations

import cv2
import numpy as np


def draw_landmarks(arr: np.ndarray, points: list[tuple[float, float]], radius: int = 2) -> np.ndarray:
    """Draw landmark points on a copy of the image, for the 'landmark overlay' UI preview."""
    canvas = arr.copy()
    for x, y in points:
        cv2.circle(canvas, (int(x), int(y)), radius, (0, 255, 128), -1, lineType=cv2.LINE_AA)
    return canvas


def landmarks_to_bbox(points: list[tuple[float, float]], pad_ratio: float = 0.15) -> tuple[int, int, int, int]:
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    x1, x2 = min(xs), max(xs)
    y1, y2 = min(ys), max(ys)
    pad_x = (x2 - x1) * pad_ratio
    pad_y = (y2 - y1) * pad_ratio
    return int(x1 - pad_x), int(y1 - pad_y), int(x2 + pad_x), int(y2 + pad_y)
