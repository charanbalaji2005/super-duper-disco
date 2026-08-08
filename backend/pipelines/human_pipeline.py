"""Human-specific entry point. Currently a thin pass-through — kept as its
own module so subject-specific tuning (e.g. a human-only ControlNet or
LoRA) can be added without touching the shared orchestration logic."""
from __future__ import annotations

import numpy as np

from backend.pipelines.expression_pipeline import PipelineOutput, run_expression_pipeline


def run_human_pipeline(
    image_rgb: np.ndarray,
    expressions: list[str] | None = None,
    lora_name: str | None = None,
    lora_weight: float | None = None,
    callback=None,
) -> PipelineOutput:
    return run_expression_pipeline(image_rgb, expressions, lora_name=lora_name, lora_weight=lora_weight, callback=callback)
