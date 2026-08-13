
"""
Skeleton training script for the human/animal (and optionally gender/species)
classifiers referenced in backend/services/classifier_service.py.

This is intentionally left as a scaffold: point --data-dir at an
ImageFolder-style dataset (one subdirectory per class) and fill in the
architecture you want (a fine-tuned ResNet/EfficientNet is a reasonable
default for this task size).
"""
from __future__ import annotations

import argparse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True, help="ImageFolder-style dataset root")
    parser.add_argument("--task", choices=["human_animal", "gender", "animal_species"], required=True)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--out", default=None, help="Output dir, defaults to models/classifiers/<task>")
    args = parser.parse_args()

    raise NotImplementedError(
        "Fill in a torchvision ImageFolder + fine-tuned CNN training loop here, "
        "then export to ONNX into models/classifiers/<task>/ so classifier_service.py picks it up."
    )


if __name__ == "__main__":
    main()
