"""
Low-level image helpers shared across preprocessing/services.
Kept dependency-light (PIL + numpy + cv2) so it's easy to unit test.
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Tuple

import cv2
import numpy as np
from PIL import Image, ImageOps


def load_image_rgb(path: str | Path) -> np.ndarray:
    """Load an image from disk as RGB numpy array (H, W, 3), EXIF-corrected."""
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    return np.array(img)


def bytes_to_rgb(data: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    return np.array(img)


def rgb_to_pil(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(arr.astype(np.uint8), mode="RGB")


def save_rgb(arr: np.ndarray, path: str | Path, quality: int = 95) -> None:
    rgb_to_pil(arr).save(path, quality=quality)


def resize_max_side(arr: np.ndarray, max_side: int = 1024) -> np.ndarray:
    h, w = arr.shape[:2]
    scale = max_side / max(h, w)
    if scale >= 1.0:
        return arr
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(arr, (new_w, new_h), interpolation=cv2.INTER_AREA)


def center_crop_square(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    side = min(h, w)
    top = (h - side) // 2
    left = (w - side) // 2
    return arr[top : top + side, left : left + side]


def laplacian_blur_variance(arr: np.ndarray) -> float:
    """Higher = sharper. Used to reject blurry uploads/outputs."""
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def to_square_canvas(arr: np.ndarray, size: int, fill=(0, 0, 0)) -> np.ndarray:
    """Resize preserving aspect ratio and pad to a size x size canvas."""
    h, w = arr.shape[:2]
    scale = size / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = cv2.resize(arr, (new_w, new_h), interpolation=cv2.INTER_AREA)
    canvas = np.full((size, size, 3), fill, dtype=np.uint8)
    y_off = (size - new_h) // 2
    x_off = (size - new_w) // 2
    canvas[y_off : y_off + new_h, x_off : x_off + new_w] = resized
    return canvas
