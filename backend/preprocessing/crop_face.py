from __future__ import annotations

import numpy as np


def crop_with_margin(
    arr: np.ndarray,
    bbox: tuple[int, int, int, int],
    margin_ratio: float = 0.35,
) -> np.ndarray:
    """
    Crop a face region from `arr` given bbox=(x1, y1, x2, y2), expanding by
    margin_ratio on each side (clamped to image bounds) so alignment/landmark
    steps have context beyond just the tight face box.
    """
    h, w = arr.shape[:2]
    x1, y1, x2, y2 = bbox
    bw, bh = x2 - x1, y2 - y1

    mx, my = int(bw * margin_ratio), int(bh * margin_ratio)
    nx1 = max(0, x1 - mx)
    ny1 = max(0, y1 - my)
    nx2 = min(w, x2 + mx)
    ny2 = min(h, y2 + my)

    return arr[ny1:ny2, nx1:nx2]
