"""
Builds the final prompt string sent to Stable Diffusion.

Design note: gender classification is deliberately NOT used to alter the
prompt. Facial expressions are not gendered, and baking gender into the
prompt would just add an unnecessary (and bias-prone) variable. Gender/
species classification results are surfaced to the UI purely as metadata.
Subject category (human vs animal) DOES matter, since "photorealistic human
face" vs "photorealistic animal face" prompt framing measurably improves
img2img fidelity for SD1.5.

Prompt structure (short + focused, proven to outperform huge paragraph
templates for SD1.5 img2img expression editing):

  IDENTITY_ANCHOR  +  EXPRESSION_TEXT  +  QUALITY_TAIL

- IDENTITY_ANCHOR  : pins the subject/species so SD doesn't drift to a
                     generic face; kept short so it doesn't dilute the
                     expression tokens.
- EXPRESSION_TEXT  : the per-expression .txt file — short, verb-rich,
                     anatomically specific muscle descriptions.
- QUALITY_TAIL     : shared tokens for photorealism and scene consistency.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from backend.config import get_settings



_IDENTITY_ANCHOR = {
    "human": "same person, same face, same identity,",
    "animal": "same animal, same face, same identity,",
}



_QUALITY_TAIL = (
    "photorealistic portrait, same lighting, same background, same pose, "
    "same skin tone, same hairstyle, high detail skin texture, sharp focus"
)


def _load_expression_prompt(expression: str) -> str:
    settings = get_settings()
    path: Path = settings.prompts_dir / f"{expression.lower()}.txt"
    if not path.exists():
        raise FileNotFoundError(f"No prompt file for expression '{expression}' at {path}")
    return path.read_text().strip()


def build_prompt(expression: str, subject_category: str) -> str:
    """
    Constructs: IDENTITY_ANCHOR  EXPRESSION_TEXT,  QUALITY_TAIL
    e.g.:
      "same person, same face, same identity, same person, strong anger,
       eyebrows sharply furrowed downward and inward, narrowed eyes, tense
       eyelids, compressed lips, clenched jaw, intense gaze, photorealistic
       portrait, same lighting, same background, same pose, same skin tone,
       same hairstyle, high detail skin texture, sharp focus"
    """
    anchor = _IDENTITY_ANCHOR.get(subject_category, _IDENTITY_ANCHOR["human"])
    expression_text = _load_expression_prompt(expression)
    return f"{anchor} {expression_text}, {_QUALITY_TAIL}"
