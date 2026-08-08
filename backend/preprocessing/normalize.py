from __future__ import annotations

import numpy as np


def normalize_uint8(arr: np.ndarray) -> np.ndarray:
    """Ensure a clean uint8 RGB array (handles float/0-1 inputs defensively)."""
    if arr.dtype != np.uint8:
        if arr.max() <= 1.0:
            arr = (arr * 255.0).clip(0, 255)
        arr = arr.astype(np.uint8)
    return arr


def to_model_input(arr: np.ndarray) -> np.ndarray:
    """Normalize to [-1, 1] float32, the range Stable Diffusion's VAE expects."""
    arr = normalize_uint8(arr).astype(np.float32)
    return (arr / 127.5) - 1.0
