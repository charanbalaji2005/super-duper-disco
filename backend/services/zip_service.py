from __future__ import annotations

import io
import zipfile
from pathlib import Path


def build_zip(image_paths: dict[str, Path]) -> io.BytesIO:
    """
    image_paths: {arcname (e.g. 'happy.png') -> filesystem path}
    Returns an in-memory ZIP buffer ready to stream as a FastAPI response.
    """
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for arcname, path in image_paths.items():
            zf.write(path, arcname=arcname)
    buffer.seek(0)
    return buffer
