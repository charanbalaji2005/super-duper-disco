
"""Evaluate generation quality-pass rate across a folder of test images."""
from __future__ import annotations

import argparse
from pathlib import Path

from backend.pipelines.expression_pipeline import run_expression_pipeline
from backend.utils.image_utils import load_image_rgb
from backend.utils.logger import logger

EXPRESSIONS = ["happy", "sad", "angry", "surprise", "fear", "disgust", "neutral"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--images-dir", required=True)
    args = parser.parse_args()

    total, passed = 0, 0
    for img_path in Path(args.images_dir).glob("*.*"):
        try:
            image_rgb = load_image_rgb(img_path)
            output = run_expression_pipeline(image_rgb, EXPRESSIONS)
        except Exception as e:
            logger.error("Failed on {}: {}", img_path, e)
            continue
        for _, report in output.generations:
            total += 1
            passed += int(report.passed)

    rate = (passed / total * 100) if total else 0.0
    print(f"Quality pass rate: {passed}/{total} ({rate:.1f}%)")


if __name__ == "__main__":
    main()
