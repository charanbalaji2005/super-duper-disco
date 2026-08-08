"""
Centralized loguru-based logging. Import `logger` anywhere in the backend.
"""
import sys

from loguru import logger

from backend.config import get_settings

_settings = get_settings()

logger.remove()
logger.add(sys.stderr, level=_settings.log_level, backtrace=False, diagnose=False)
logger.add(
    _settings.log_dir / "app.log",
    rotation="20 MB",
    retention="14 days",
    level=_settings.log_level,
    enqueue=True,
)

__all__ = ["logger"]
