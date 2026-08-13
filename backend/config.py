"""
Centralized application configuration.

Loads from environment variables (.env) with sane defaults, plus a
config.yaml for things that are more "editorial" than secret (prompt
weights, quality thresholds, etc).
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    database_url: str = "sqlite+aiosqlite:///./backend/database/app.db"

    sd_model_path: str = "./models/stable-diffusion-v1-5"
    insightface_model_root: str = "./models/insightface"
    device: Literal["cuda", "cpu", "mps"] = "cuda"

    max_upload_mb: int = 15
    generation_strength: float = 0.45
    generation_guidance_scale: float = 7.5
    generation_steps: int = 13

    log_level: str = "INFO"

    upload_dir: Path = BASE_DIR / "backend" / "uploads"
    output_dir: Path = BASE_DIR / "backend" / "outputs"
    temp_dir: Path = BASE_DIR / "backend" / "temp"
    log_dir: Path = BASE_DIR / "backend" / "logs"
    prompts_dir: Path = BASE_DIR / "backend" / "prompts"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.device == "cuda":
        try:
            import torch
            if not torch.cuda.is_available():
                import logging
                logging.warning("CUDA configured but torch.cuda.is_available() is False. Falling back to CPU.")
                settings.device = "cpu"
        except ImportError:
            settings.device = "cpu"

    for d in (settings.upload_dir, settings.output_dir, settings.temp_dir, settings.log_dir):
        d.mkdir(parents=True, exist_ok=True)
    return settings


@lru_cache
def get_app_config() -> dict:
    """Load the editorial config.yaml (quality thresholds, expression list, etc)."""
    config_path = BASE_DIR / "config.yaml"
    if not config_path.exists():
        return {}
    with open(config_path, "r") as f:
        return yaml.safe_load(f) or {}
