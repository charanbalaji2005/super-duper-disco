
"""
Builds a LoRA-training-ready dataset from images organized under
datasets/generated/<expression>/*.{jpg,png}, using the exact same prompt
text as inference time (backend/prompts/<expression>.txt) so training
captions and generation prompts match.

You need to supply the training *images* yourself — e.g. a set of aligned
512x512 face crops per expression, ideally many different identities per
expression so the LoRA learns "how to change expression" rather than
memorizing one person's face. A few hundred images per expression is a
reasonable starting point; more is better.

Usage:
    python scripts/prepare_lora_dataset.py \
        --source-dir datasets/generated \
        --output-dir datasets/lora_training \
        --subject-category human
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=ROOT / "datasets" / "generated")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "datasets" / "lora_training")
    parser.add_argument("--subject-category", choices=["human", "animal"], default="human")
    args = parser.parse_args()

    prompts_dir = ROOT / "backend" / "prompts"
    framing = {
        "human": "photorealistic portrait of a person,",
        "animal": "photorealistic close-up photo of an animal's face,",
    }[args.subject_category]

    images_out = args.output_dir / "images"
    images_out.mkdir(parents=True, exist_ok=True)
    metadata_path = args.output_dir / "metadata.jsonl"

    entries = []
    counter = 0

    expression_dirs = sorted(p for p in args.source_dir.iterdir() if p.is_dir())
    if not expression_dirs:
        raise SystemExit(f"No expression subdirectories found under {args.source_dir}")

    for expr_dir in expression_dirs:
        expression = expr_dir.name
        prompt_file = prompts_dir / f"{expression}.txt"
        if not prompt_file.exists():
            print(f"Skipping '{expression}': no matching prompt file at {prompt_file}")
            continue
        caption = f"{framing} {prompt_file.read_text().strip()}"

        images = [p for p in expr_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS]
        if not images:
            print(f"No images found in {expr_dir}, skipping.")
            continue

        for img_path in images:
            file_name = f"{counter:05d}{img_path.suffix.lower()}"
            shutil.copy(img_path, images_out / file_name)
            entries.append({"file_name": file_name, "text": caption})
            counter += 1

        print(f"{expression}: {len(images)} images")

    metadata_path.write_text("\n".join(json.dumps(e) for e in entries))
    print(f"\nWrote {len(entries)} entries to {metadata_path}")
    print(f"Train with:\n  python scripts/train_lora.py --data-dir {args.output_dir} --output-name my-expression-lora")


if __name__ == "__main__":
    main()
