
"""
Downloads the model weights this project needs. Run once before starting the
backend:

    python scripts/download_models.py

Requires `huggingface_hub` and `insightface` to be installed
(`pip install -r requirements.txt`) and internet access to huggingface.co.
"""
from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def download_stable_diffusion():
    from huggingface_hub import snapshot_download

    dest = ROOT / "models" / "stable-diffusion-v1-5"
    dest.mkdir(parents=True, exist_ok=True)
    print(f"Downloading runwayml/stable-diffusion-v1-5 -> {dest}")
    snapshot_download(repo_id="runwayml/stable-diffusion-v1-5", local_dir=dest, local_dir_use_symlinks=False)


def download_insightface():


    from insightface.app import FaceAnalysis

    dest = ROOT / "models" / "insightface"
    dest.mkdir(parents=True, exist_ok=True)
    print(f"Downloading InsightFace buffalo_l pack -> {dest}")
    app = FaceAnalysis(name="buffalo_l", root=str(dest))
    app.prepare(ctx_id=-1)


def main():
    parser = argparse.ArgumentParser(description="Download model weights.")
    parser.add_argument("--sd", action="store_true", help="Download Stable Diffusion 1.5 only")
    parser.add_argument("--insightface", action="store_true", help="Download InsightFace only")
    args = parser.parse_args()

    run_all = not (args.sd or args.insightface)

    if args.sd or run_all:
        download_stable_diffusion()
    if args.insightface or run_all:
        download_insightface()

    print("Done. MediaPipe's Face Mesh/Detection models are bundled with the `mediapipe` pip package.")
    print("Optional: place human/animal + gender + species classifier weights under models/classifiers/*.")


if __name__ == "__main__":
    main()
