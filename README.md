# Synthetic Facial Expression Generator

Identity-preserving synthetic facial expression generation from a single
uploaded image, using Stable Diffusion 1.5 img2img. Supports human and
animal subjects. Built as a research-grade, modular full-stack app.

> **Scope note:** this system edits *the same subject's own photo* to change
> expression (identity is preserved, not swapped) — the same family of
> technique used in academic facial-expression-synthesis research (e.g.
> GANimation, StarGAN expression editing). It does not do face-swapping or
> identity transfer between different people, and the quality gate actively
> rejects outputs whose identity has drifted too far from the source.

## Architecture

```
Upload → Face Detection → Landmark Detection → Face Alignment →
Human/Animal (+ subtype) Classification → Expression Selection →
SD 1.5 img2img Generation → Quality Verification → Gallery / ZIP Download
```

- **Backend**: FastAPI, async SQLAlchemy, InsightFace + MediaPipe for
  detection/landmarks/alignment, Diffusers for SD1.5 img2img.
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind.
- **Storage**: SQLite by default (swap `DATABASE_URL` for Postgres in prod).

See `backend/pipelines/expression_pipeline.py` for the orchestration logic
and `backend/services/` for each individual model wrapper.

## Setup

### 1. Backend

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # if you renamed the provided .env, otherwise edit .env directly
```

### 2. Download models

```bash
python scripts/download_models.py
```

This pulls:
- `runwayml/stable-diffusion-v1-5` from Hugging Face into `models/stable-diffusion-v1-5/`
- InsightFace's `buffalo_l` pack into `models/insightface/`

MediaPipe's landmark/detection models ship inside the `mediapipe` pip
package, no separate download needed.

**Optional — classifiers**: the human/animal, gender, and animal-species
classifiers in `backend/services/classifier_service.py` ship with a
heuristic fallback (no weights needed) so the pipeline runs end-to-end
immediately. To use real trained classifiers, train with
`scripts/train_classifier.py` and export ONNX weights into
`models/classifiers/{human_animal,gender,animal}/`.

### 3. Run the backend

```bash
uvicorn backend.app:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for interactive API docs.

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`.

### 5. Or run everything with Docker

```bash
docker compose up --build
```

Requires the NVIDIA Container Toolkit for GPU access.

## Tests

```bash
pytest
```

Tests cover validators, the heuristic classifier, alignment math, prompt
building (including a regression test that gender never leaks into the
generation prompt), and blur-quality scoring — all runnable without any
downloaded model weights.

## LoRA training (teach SD1.5 your expression-editing task)

Prompt engineering alone only gets you so far — a LoRA adapter trained
specifically on "same face, only the expression changes" pairs gives much
more consistent, identity-preserving results. Workflow:

```bash
# 1. Populate datasets/generated/<expression>/ with training images
#    (aligned 512x512 face crops; several hundred+ per expression across
#    many different identities is a reasonable starting point).

# 2. Build the images/ + metadata.jsonl dataset, captions taken straight
#    from backend/prompts/*.txt so training matches inference:
python scripts/prepare_lora_dataset.py \
    --source-dir datasets/generated \
    --output-dir datasets/lora_training \
    --subject-category human

# 3. Train (unet-only LoRA by default; add --train-text-encoder for more
#    capacity at the cost of more VRAM/time):
python scripts/train_lora.py \
    --data-dir datasets/lora_training \
    --output-name my-expression-lora

# 4. Use it — either set it as the default in config.yaml:
#      lora:
#        default_lora_name: "my-expression-lora"
#    or select it per-request via POST /api/generate {"lora_name": "my-expression-lora"}
#    or pick it from the LoRA dropdown in the frontend (populated from GET /api/lora).
```

Key hyperparameters live in `config.yaml` under `lora_training:` (rank,
alpha, learning rate, steps, mixed precision, etc.) and can be overridden
with CLI flags on `train_lora.py`. Training uses `diffusers` + `peft` +
`accelerate` (see `requirements.txt`) and checkpoints every
`checkpointing_steps` steps to `models/loras/<output-name>/`.

## Generating all 7 expressions at once

`POST /api/generate` generates all 7 supported expressions
(happy, sad, angry, surprise, fear, disgust, neutral) from a single upload
in one call if you omit `expressions` (or pass an empty list) — this is also
the frontend's default (the expression selector starts with all 7 checked).
The SD1.5 pipeline (and any active LoRA) is loaded once and reused across
all 7 generations rather than reloaded per-expression.


| Endpoint | Method | Purpose |
|---|---|---|
| `/api/upload` | POST | Upload an image |
| `/api/classify/{filename}` | GET | Human/animal + subtype classification |
| `/api/detect/{filename}` | GET | Face bbox + confidence |
| `/api/align/{filename}` | GET | Aligned face preview (PNG) |
| `/api/generate` | POST | Generate selected expressions (omit `expressions` for all 7) |
| `/api/lora` | GET | List trained LoRA adapters available under `models/loras/` |
| `/api/quality/{request_id}` | GET | Quality report per generated image |
| `/api/download/{request_id}/{expression}` | GET | Download one image |
| `/api/download/{request_id}/zip` | GET | Download all as ZIP |
| `/api/history` | GET | Past generation requests |

## Design decisions worth knowing about

- **Gender is not used to steer generation.** `prompt_builder.py` only takes
  `subject_category` (human/animal), not gender/species — expressions aren't
  gendered, and baking that in would just add bias-prone noise. Gender/
  species classification is surfaced as metadata only. See
  `tests/test_generation.py::test_gender_does_not_affect_prompt`.
- **Identity preservation is enforced, not just requested.** Low img2img
  `strength` + explicit "same person/lighting/background/pose" prompting do
  the heavy lifting; `quality_checker.py` then verifies via ArcFace cosine
  similarity and rejects/retries outputs that drift too far (see
  `MAX_REGENERATE_ATTEMPTS` in `expression_pipeline.py`).
- **Graceful degradation.** InsightFace → MediaPipe fallback for detection;
  classifiers → heuristic fallback if no weights are present. The app is
  runnable and testable before you've downloaded a single model.

## Extending

- Swap in **IP-Adapter FaceID** or a reference-only **ControlNet** for
  stronger identity locking on hard cases (stub point:
  `img2img_generator.py`).
- Add a `GET /api/history` endpoint (there's a `get_history()` CRUD function
  already in `backend/database/crud.py` — just needs a router) to back
  `frontend/app/history/page.tsx`.
- `notebooks/` has starter notebooks for training/testing/evaluation
  experiments outside the API.
