"""
Stable Diffusion v1.5 Image-to-Image generation service.

Identity preservation strategy (in order of how much they help, cheapest first):
  1. Low denoising `strength` (~0.35-0.5) so img2img only nudges the image
     rather than repainting it — this is the single biggest lever.
  2. A tightly-scoped prompt that explicitly says "same person / same face
     identity / same lighting / same background / same pose" and only
     describes the *expression* change.
  3. A fine-tuned LoRA adapter trained specifically on expression-edit pairs
     (see scripts/train_lora.py) — this is what actually teaches SD1.5 what
     "keep everything, only change the expression" looks like, rather than
     relying purely on prompt engineering.

This module intentionally does NOT do face-swapping or identity transfer
between different people — it edits one subject's own photo to change their
expression, matching the "research on facial expression synthesis" use case
(the same family of techniques as GANimation / StarGAN expression editing).
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

from backend.config import get_app_config, get_settings
from backend.services.prompt_builder import build_prompt
from backend.utils.logger import logger

ALL_EXPRESSIONS = ["happy", "sad", "angry", "surprise", "fear", "disgust", "neutral"]


@dataclass
class GenerationResult:
    expression: str
    image: Image.Image
    seed: int


class Img2ImgGenerator:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.gen_cfg = get_app_config().get("generation", {})
        self.lora_cfg = get_app_config().get("lora", {})
        self._pipe = None
        self._loaded_lora_name: str | None = None

    def _load_pipeline(self):
        if self._pipe is not None:
            return self._pipe

        model_path = Path(self.settings.sd_model_path)
        if not model_path.exists() or not any(model_path.iterdir()):
            raise FileNotFoundError(
                f"No Stable Diffusion 1.5 weights found at {model_path}. "
                f"Run `python scripts/download_models.py` first (see README)."
            )

        import torch
        from diffusers import DPMSolverMultistepScheduler, StableDiffusionImg2ImgPipeline

        logger.info("Loading Stable Diffusion 1.5 img2img pipeline from {}", model_path)
        dtype = torch.float16 if self.settings.device == "cuda" else torch.float32
        pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            str(model_path), torch_dtype=dtype, safety_checker=None, low_cpu_mem_usage=True
        )


        pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
        pipe = pipe.to(self.settings.device)
        if self.settings.device == "cuda":
            try:
                pipe.enable_xformers_memory_efficient_attention()
            except Exception:
                logger.warning("xformers not available; continuing without memory-efficient attention.")
        self._pipe = pipe


        default_lora = self.lora_cfg.get("default_lora_name")
        if default_lora:
            self.set_lora(default_lora, weight=self.lora_cfg.get("default_scale", 0.8))

        return self._pipe


    def list_available_loras(self) -> list[str]:
        lora_root = Path("models/loras")
        if not lora_root.exists():
            return []
        return sorted(
            p.name
            for p in lora_root.iterdir()
            if p.is_dir() and (any(p.glob("*.safetensors")) or any(p.glob("*.bin")))
        )

    def set_lora(self, lora_name: str | None, weight: float = 0.8) -> None:
        """
        Load (or unload, if lora_name is None) a trained LoRA adapter onto the
        pipeline. LoRAs are expected under models/loras/<lora_name>/ as
        produced by scripts/train_lora.py.
        """
        if lora_name == self._loaded_lora_name:
            return



        pipe = self._load_pipeline()



        if self._loaded_lora_name is not None:
            try:
                pipe.unload_lora_weights()
            except Exception as e:
                logger.warning("Failed to cleanly unload previous LoRA: {}", e)
            self._loaded_lora_name = None

        if lora_name is None:
            return

        lora_dir = Path("models/loras") / lora_name
        if not lora_dir.exists():
            raise FileNotFoundError(
                f"No LoRA found at {lora_dir}. Train one with scripts/train_lora.py first, "
                f"or check `GET /api/lora` for available names."
            )

        logger.info("Loading LoRA adapter '{}' (weight={}) from {}", lora_name, weight, lora_dir)
        pipe.load_lora_weights(str(lora_dir))
        pipe.fuse_lora(lora_scale=weight)
        self._loaded_lora_name = lora_name


    def generate(
        self,
        aligned_face: np.ndarray,
        expression: str,
        subject_category: str,
        seed: int | None = None,
        strength: float | None = None,
        lora_name: str | None = None,
        lora_weight: float | None = None,
        callback=None,
    ) -> GenerationResult:
        self._load_pipeline()
        if lora_name is not None:
            self.set_lora(lora_name, weight=lora_weight if lora_weight is not None else 0.8)

        pipe = self._pipe

        import torch

        generator = torch.Generator(device=self.settings.device)
        if seed is not None:
            generator = generator.manual_seed(seed)
        else:
            seed = generator.seed()

        prompt = build_prompt(expression=expression, subject_category=subject_category)
        negative_prompt = self.gen_cfg.get("negative_prompt", "")

        init_image = Image.fromarray(aligned_face).convert("RGB")






        step_end_fn = None
        if callback is not None:
            def step_end_fn(pipe_ref, step_index: int, timestep, callback_kwargs: dict) -> dict:
                callback(step_index, timestep, callback_kwargs.get("latents"))
                return callback_kwargs

        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=init_image,
            strength=strength or self.gen_cfg.get("default_strength", self.settings.generation_strength),
            guidance_scale=self.gen_cfg.get("default_guidance_scale", self.settings.generation_guidance_scale),
            num_inference_steps=self.gen_cfg.get("default_steps", self.settings.generation_steps),
            generator=generator,
            callback_on_step_end=step_end_fn,
        )
        image = result.images[0]

        return GenerationResult(expression=expression, image=image, seed=seed)

    def generate_batch(
        self,
        aligned_face: np.ndarray,
        expressions: list[str],
        subject_category: str,
        seed: int | None = None,
        lora_name: str | None = None,
        lora_weight: float | None = None,
        callback=None,
    ) -> list[GenerationResult]:
        """
        Generate every requested expression from the same aligned source
        image in one call. Defaults to all 7 supported expressions
        (happy, sad, angry, surprise, fear, disgust, neutral) if none are
        given. The pipeline and any LoRA are loaded once and reused across
        all 7 generations rather than reloaded per-expression.
        """
        expressions = expressions or ALL_EXPRESSIONS
        self._load_pipeline()
        if lora_name is not None:
            self.set_lora(lora_name, weight=lora_weight if lora_weight is not None else 0.8)

        results = []
        for i, expr in enumerate(expressions):
            expr_callback = None
            if callback:


                expr_callback = lambda step, timestep, latents, idx=i, label=expr: callback(idx, len(expressions), label, step)
            results.append(self.generate(aligned_face, expr, subject_category, seed=seed, callback=expr_callback))
        return results


@lru_cache
def get_generator() -> Img2ImgGenerator:
    return Img2ImgGenerator()
