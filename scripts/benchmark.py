
"""Simple latency benchmark for the generation pipeline (requires models downloaded)."""
from __future__ import annotations

import time

from backend.pipelines.expression_pipeline import run_expression_pipeline
from backend.utils.image_utils import load_image_rgb


def main(image_path: str, expressions: list[str]):
    image_rgb = load_image_rgb(image_path)
    start = time.perf_counter()
    output = run_expression_pipeline(image_rgb, expressions)
    elapsed = time.perf_counter() - start
    print(f"Generated {len(expressions)} expression(s) in {elapsed:.2f}s")
    print(f"Classification: {output.classification}")
    for expr, path in output.output_paths.items():
        print(f"  {expr}: {path}")


if __name__ == "__main__":
    import sys

    main(sys.argv[1], sys.argv[2:] or ["happy", "sad", "neutral"])
