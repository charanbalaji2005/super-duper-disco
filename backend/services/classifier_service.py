"""
Classification service.

Wraps three lightweight classifiers behind one interface:
  1. human_vs_animal
  2. gender (male/female)      - only used for metadata/analytics, NOT to alter
                                  expression generation logic (see prompt_builder.py)
  3. animal species (cat/dog/other)

Model loading is lazy + cached so the FastAPI app starts fast and only pays
the cost when the first request needing that model comes in.

Each classifier runs in one of two modes:
  - "onnx": a real trained model was found under
    models/classifiers/{human_animal,gender,animal}/ (see onnx_classifier.py
    for the expected export format) — used automatically when present.
  - "heuristic": no weights found, falls back to an interpretable rule so the
    rest of the pipeline stays testable end-to-end without any training run.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

from backend.config import get_app_config, get_settings
from backend.services.onnx_classifier import OnnxClassifier
from backend.utils.logger import logger


@dataclass
class ClassificationResult:
    category: str          # "human" | "animal"
    subtype: str            # "male" | "female" | "cat" | "dog" | "other" | "unspecified"
    category_confidence: float
    subtype_confidence: float


class ClassifierService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.cfg = get_app_config().get("classification", {})
        self._human_animal_model = None
        self._gender_model = None
        self._animal_species_model = None

    # -- lazy loaders -----------------------------------------------------
    def _load(self, attr: str, subdir: str):
        cached = getattr(self, attr)
        if cached is not None:
            return cached

        model_dir = Path("models/classifiers") / subdir
        try:
            model = OnnxClassifier(model_dir)
            logger.info("Loaded ONNX classifier for '{}' from {}", subdir, model_dir)
        except FileNotFoundError:
            logger.warning("No trained weights for '{}' classifier — using heuristic fallback.", subdir)
            model = "heuristic"
        setattr(self, attr, model)
        return model

    def _load_human_animal_model(self):
        return self._load("_human_animal_model", "human_animal")

    def _load_gender_model(self):
        return self._load("_gender_model", "gender")

    def _load_animal_species_model(self):
        return self._load("_animal_species_model", "animal")

    # -- public API ---------------------------------------------------------
    def classify(self, face_crop: np.ndarray, has_animal_face_landmarks: bool) -> ClassificationResult:
        """
        `has_animal_face_landmarks` comes from face_detector: if a human face
        detector found nothing but an animal-face heuristic/model did, that's
        already strong evidence for the human/animal branch (used only by the
        heuristic fallback, ignored once a real model is loaded).
        """
        model = self._load_human_animal_model()
        category, cat_conf = self._run_human_animal(face_crop, has_animal_face_landmarks, model)

        if category == "human":
            gmodel = self._load_gender_model()
            subtype, sub_conf = self._run_gender(face_crop, gmodel)
        else:
            smodel = self._load_animal_species_model()
            subtype, sub_conf = self._run_species(face_crop, smodel)

        return ClassificationResult(
            category=category,
            subtype=subtype,
            category_confidence=cat_conf,
            subtype_confidence=sub_conf,
        )

    # -- inference ------------------------------------------------------
    def _run_human_animal(self, face_crop: np.ndarray, animal_hint: bool, model) -> tuple[str, float]:
        if isinstance(model, OnnxClassifier):
            return model.predict(face_crop)
        # Heuristic fallback: trust upstream detector hint.
        return ("animal", 0.6) if animal_hint else ("human", 0.6)

    def _run_gender(self, face_crop: np.ndarray, model) -> tuple[str, float]:
        if isinstance(model, OnnxClassifier):
            return model.predict(face_crop)
        return ("unspecified", 0.0)  # heuristic mode intentionally abstains

    def _run_species(self, face_crop: np.ndarray, model) -> tuple[str, float]:
        if isinstance(model, OnnxClassifier):
            return model.predict(face_crop)
        return ("other", 0.0)


@lru_cache
def get_classifier_service() -> ClassifierService:
    return ClassifierService()
