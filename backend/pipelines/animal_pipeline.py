"""Animal-specific entry point. Same shared orchestration; the prompt_builder
already swaps in animal-appropriate framing based on classification.category."""
from __future__ import annotations

import numpy as np

from backend.pipelines.expression_pipeline import PipelineOutput, run_expression_pipeline


def run_animal_pipeline(
    image_rgb: np.ndarray,
    expressions: list[str] | None = None,
    lora_name: str | None = None,
    lora_weight: float | None = None,
    callback=None,
) -> PipelineOutput:
    return run_expression_pipeline(image_rgb, expressions, lora_name=lora_name, lora_weight=lora_weight, callback=callback)
