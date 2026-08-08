"""
Generic ONNX image-classifier runner shared by the human/animal, gender, and
animal-species classifiers.

Convention this expects from a trained model exported via
`scripts/train_classifier.py`:
  - A single `.onnx` file in the model's directory.
  - A sibling `labels.json` file: a JSON list of class names, ordered to
    match the model's output logits, e.g. ["human", "animal"].
  - Input: NCHW float32 tensor, RGB, normalized to [0, 1], resized to
    `input_size` (default 224x224) — standard torchvision ImageFolder
    preprocessing convention.
"""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np


class OnnxClassifier:
    def __init__(self, model_dir: Path, input_size: int = 224):
        onnx_files = list(model_dir.glob("*.onnx"))
        if not onnx_files:
            raise FileNotFoundError(f"No .onnx file found in {model_dir}")
        labels_path = model_dir / "labels.json"
        if not labels_path.exists():
            raise FileNotFoundError(f"No labels.json found in {model_dir}")

        import onnxruntime as ort

        self.session = ort.InferenceSession(
            str(onnx_files[0]), providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
        )
        self.input_name = self.session.get_inputs()[0].name
        self.labels: list[str] = json.loads(labels_path.read_text())
        self.input_size = input_size

    def _preprocess(self, image_rgb: np.ndarray) -> np.ndarray:
        resized = cv2.resize(image_rgb, (self.input_size, self.input_size), interpolation=cv2.INTER_AREA)
        arr = resized.astype(np.float32) / 255.0
        arr = arr.transpose(2, 0, 1)  # HWC -> CHW
        return np.expand_dims(arr, axis=0)  # add batch dim

    @staticmethod
    def _softmax(logits: np.ndarray) -> np.ndarray:
        exp = np.exp(logits - np.max(logits))
        return exp / exp.sum()

    def predict(self, image_rgb: np.ndarray) -> tuple[str, float]:
        """Returns (predicted_label, confidence)."""
        inputs = {self.input_name: self._preprocess(image_rgb)}
        logits = self.session.run(None, inputs)[0][0]
        probs = self._softmax(logits)
        idx = int(np.argmax(probs))
        return self.labels[idx], float(probs[idx])
