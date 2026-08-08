from __future__ import annotations

import time
import uuid
from contextlib import contextmanager
from typing import Iterator

from backend.utils.logger import logger


def new_id(prefix: str = "") -> str:
    uid = uuid.uuid4().hex[:12]
    return f"{prefix}_{uid}" if prefix else uid


@contextmanager
def timed(label: str) -> Iterator[None]:
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        logger.debug(f"[timing] {label}: {elapsed:.3f}s")
