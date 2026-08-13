
"""
Prepares the LoRA training dataset from train_labels.csv + DATASET/train/.

What this does
--------------
1. Reads train_labels.csv (columns: image, label where label 1-7 maps to
   surprise / fear / disgust / happy / sad / angry / neutral).
2. Reads each expression prompt from backend/prompts/<expression>.txt —
   the SAME files used at inference time — so training captions and runtime
   prompts are always in sync.
3. Builds the caption using the same ANCHOR + EXPRESSION + QUALITY_TAIL
   structure as prompt_builder.py, so the LoRA adapter learns to respond to
   the exact prompt pattern the inference pipeline uses.
4. Copies images into datasets/lora_training/images/ and writes
   metadata.jsonl ready for diffusers LoRA training.

Usage
-----
    python scripts/prepare_custom_dataset.py

Then train:
    python scripts/train_lora.py --data-dir datasets/lora_training \\
        --output-name custom-expressions-lora
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


EXPRESSIONS = {
    "1": "surprise",
    "2": "fear",
    "3": "disgust",
    "4": "happy",
    "5": "sad",
    "6": "angry",
    "7": "neutral",
}


IDENTITY_ANCHOR = "same person, same face, same identity,"


QUALITY_TAIL = (
    "photorealistic portrait, same lighting, same background, same pose, "
    "same skin tone, same hairstyle, high detail skin texture, sharp focus"
)


def load_expression_captions(prompts_dir: Path) -> dict[str, str]:
    """
    Build a full training caption for each expression using the same
    ANCHOR + EXPRESSION + QUALITY_TAIL structure as prompt_builder.py.
    Falls back to a generic description if the prompt file is missing.
    """
    captions: dict[str, str] = {}
    for key, name in EXPRESSIONS.items():
        prompt_file = prompts_dir / f"{name}.txt"
        if prompt_file.exists():
            expression_text = prompt_file.read_text().strip()
        else:
            expression_text = f"same person, {name} expression"
        captions[key] = f"{IDENTITY_ANCHOR} {expression_text}, {QUALITY_TAIL}"
    return captions


def main():
    parser = argparse.ArgumentParser(
        description="Prepare LoRA training dataset from train_labels.csv + DATASET/train/"
    )
    parser.add_argument(
        "--csv-file", type=Path, default=ROOT / "train_labels.csv",
        help="Path to train_labels.csv"
    )
    parser.add_argument(
        "--dataset-dir", type=Path, default=ROOT / "DATASET" / "train",
        help="Root of DATASET/train/ (sub-dirs 1-7)"
    )
    parser.add_argument(
        "--output-dir", type=Path, default=ROOT / "datasets" / "lora_training",
        help="Output directory for images/ + metadata.jsonl"
    )
    parser.add_argument(
        "--max-per-class", type=int, default=None,
        help="Optional: cap images per expression class (helps balance an uneven dataset)"
    )
    args = parser.parse_args()

    prompts_dir = ROOT / "backend" / "prompts"
    images_out = args.output_dir / "images"
    images_out.mkdir(parents=True, exist_ok=True)
    metadata_path = args.output_dir / "metadata.jsonl"

    if not args.csv_file.exists():
        raise FileNotFoundError(f"CSV file not found: {args.csv_file}")
    if not args.dataset_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {args.dataset_dir}")

    captions = load_expression_captions(prompts_dir)

    print("Expression captions loaded:")
    for key, caption in captions.items():
        print(f"  [{key}] {EXPRESSIONS[key]:10s}: {caption[:80]}...")


    class_counts: dict[str, int] = {k: 0 for k in EXPRESSIONS}
    counter = 0
    skipped = 0

    print(f"\nParsing {args.csv_file.name} ...")
    with (
        open(args.csv_file, mode="r", encoding="utf-8") as f,
        open(metadata_path, mode="w", encoding="utf-8") as out_f,
    ):
        reader = csv.DictReader(f)
        for row in reader:
            img_name = row.get("image", "").strip()
            label = row.get("label", "").strip()
            if not img_name or label not in EXPRESSIONS:
                skipped += 1
                continue


            if args.max_per_class and class_counts[label] >= args.max_per_class:
                skipped += 1
                continue


            src = args.dataset_dir / label / img_name
            if not src.exists():
                src = args.dataset_dir / EXPRESSIONS[label] / img_name
            if not src.exists():
                skipped += 1
                continue

            dest_filename = f"{counter:05d}{src.suffix.lower()}"
            shutil.copy(src, images_out / dest_filename)

            out_f.write(json.dumps({"file_name": dest_filename, "text": captions[label]}) + "\n")

            class_counts[label] += 1
            counter += 1
            if counter % 100 == 0:
                out_f.flush()
                print(f"  {counter} images processed ...")

    print(f"\n✅ Dataset preparation complete!")
    print(f"   Total images: {counter}  |  Skipped: {skipped}")
    print(f"   Per-class distribution:")
    for key, name in EXPRESSIONS.items():
        print(f"     [{key}] {name:10s}: {class_counts[key]} images")
    print(f"\n   Output : {args.output_dir}")
    print(f"   Metadata: {metadata_path}")
    print(f"\n   Next step — train the LoRA:")
    print(f"     python scripts/train_lora.py \\")
    print(f"       --data-dir {args.output_dir} \\")
    print(f"       --output-name custom-expressions-lora")


if __name__ == "__main__":
    main()
