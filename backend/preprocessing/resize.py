from __future__ import annotations

import numpy as np

from backend.utils.image_utils import resize_max_side


def resize_for_pipeline(arr: np.ndarray, max_side: int = 1024) -> np.ndarray:
    """Downscale very large uploads before running detection, to keep latency sane."""
    return resize_max_side(arr, max_side=max_side)
