#!/usr/bin/env python3
"""
Train a LoRA adapter on top of Stable Diffusion 1.5 so it learns your
expression-editing task specifically ("same face, only the expression
changes") instead of relying on prompt engineering alone.

This trains a UNet-only LoRA (the standard choice for a single, fairly
narrow visual concept like this) using the diffusers + peft integration.

--- Dataset format ---
Point --data-dir at a folder like:

    my_dataset/
      images/
        0001.png
        0002.png
        ...
      metadata.jsonl        # one JSON object per line: {"file_name": "0001.png", "text": "..."}

`scripts/prepare_lora_dataset.py` will build this automatically from the
project's datasets/generated/<expression>/ convention (paired with the
prompt text already used at inference time in backend/prompts/*.txt), so
your training captions match your inference prompts.

--- Usage ---
    python scripts/train_lora.py \
        --data-dir datasets/lora_training \
        --output-name my-expression-lora

Then set `lora.default_lora_name: my-expression-lora` in config.yaml, or
pass `lora_name: "my-expression-lora"` on POST /api/generate.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import torch
import torch.nn.functional as F
import yaml
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from tqdm.auto import tqdm

ROOT = Path(__file__).resolve().parent.parent


def load_lora_training_config() -> dict:
    config_path = ROOT / "config.yaml"
    cfg = yaml.safe_load(config_path.read_text()) if config_path.exists() else {}
    return cfg.get("lora_training", {})


class ExpressionEditDataset(Dataset):
    """Reads images/ + metadata.jsonl produced by prepare_lora_dataset.py."""

    def __init__(self, data_dir: Path, resolution: int, tokenizer):
        self.data_dir = data_dir
        self.tokenizer = tokenizer
        metadata_path = data_dir / "metadata.jsonl"
        if not metadata_path.exists():
            raise FileNotFoundError(
                f"No metadata.jsonl in {data_dir}. Run scripts/prepare_lora_dataset.py first."
            )
        self.entries = [json.loads(line) for line in metadata_path.read_text().splitlines() if line.strip()]

        self.transform = transforms.Compose(
            [
                transforms.Resize(resolution, interpolation=transforms.InterpolationMode.BILINEAR),
                transforms.CenterCrop(resolution),
                transforms.ToTensor(),
                transforms.Normalize([0.5], [0.5]),
            ]
        )

    def __len__(self) -> int:
        return len(self.entries)

    def __getitem__(self, idx: int) -> dict:
        entry = self.entries[idx]
        image_path = self.data_dir / "images" / entry["file_name"]
        image = Image.open(image_path).convert("RGB")
        pixel_values = self.transform(image)

        tokenized = self.tokenizer(
            entry["text"],
            padding="max_length",
            truncation=True,
            max_length=self.tokenizer.model_max_length,
            return_tensors="pt",
        )
        return {"pixel_values": pixel_values, "input_ids": tokenized.input_ids[0]}


def main():
    defaults = load_lora_training_config()

    parser = argparse.ArgumentParser(description="Train a LoRA adapter for SD1.5 expression editing.")
    parser.add_argument("--data-dir", required=True, type=Path)
    parser.add_argument("--output-name", required=True, help="Saved to models/loras/<output-name>/")
    parser.add_argument("--base-model", default=defaults.get("base_model", "./models/stable-diffusion-v1-5"))
    parser.add_argument("--resolution", type=int, default=defaults.get("resolution", 512))
    parser.add_argument("--rank", type=int, default=defaults.get("rank", 16))
    parser.add_argument("--alpha", type=int, default=defaults.get("alpha", 16))
    parser.add_argument("--learning-rate", type=float, default=defaults.get("learning_rate", 1e-4))
    parser.add_argument("--train-batch-size", type=int, default=defaults.get("train_batch_size", 1))
    parser.add_argument(
        "--gradient-accumulation-steps", type=int, default=defaults.get("gradient_accumulation_steps", 4)
    )
    parser.add_argument("--max-train-steps", type=int, default=defaults.get("max_train_steps", 2000))
    parser.add_argument("--checkpointing-steps", type=int, default=defaults.get("checkpointing_steps", 500))
    parser.add_argument("--mixed-precision", default=defaults.get("mixed_precision", "fp16"))
    parser.add_argument("--train-text-encoder", action="store_true", default=defaults.get("train_text_encoder", False))
    parser.add_argument("--seed", type=int, default=defaults.get("seed", 42))
    args = parser.parse_args()

    torch.manual_seed(args.seed)

    from accelerate import Accelerator
    from accelerate.utils import set_seed
    from diffusers import AutoencoderKL, DDPMScheduler, StableDiffusionPipeline, UNet2DConditionModel
    from diffusers.optimization import get_scheduler
    from peft import LoraConfig, get_peft_model
    from transformers import CLIPTextModel, CLIPTokenizer

    set_seed(args.seed)

    accelerator = Accelerator(
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        mixed_precision=args.mixed_precision if args.mixed_precision != "no" else None,
    )

    # --- Load base SD1.5 components ---
    tokenizer = CLIPTokenizer.from_pretrained(args.base_model, subfolder="tokenizer")
    text_encoder = CLIPTextModel.from_pretrained(args.base_model, subfolder="text_encoder")
    vae = AutoencoderKL.from_pretrained(args.base_model, subfolder="vae")
    unet = UNet2DConditionModel.from_pretrained(args.base_model, subfolder="unet")
    noise_scheduler = DDPMScheduler.from_pretrained(args.base_model, subfolder="scheduler")

    vae.requires_grad_(False)
    text_encoder.requires_grad_(not args.train_text_encoder and False or args.train_text_encoder)
    unet.requires_grad_(False)

    # --- Inject LoRA adapters into the UNet's cross/self-attention layers ---
    unet_lora_config = LoraConfig(
        r=args.rank,
        lora_alpha=args.alpha,
        target_modules=["to_k", "to_q", "to_v", "to_out.0"],
        lora_dropout=0.05,
    )
    unet = get_peft_model(unet, unet_lora_config)
    unet.print_trainable_parameters()

    params_to_train = list(filter(lambda p: p.requires_grad, unet.parameters()))
    if args.train_text_encoder:
        text_encoder_lora_config = LoraConfig(
            r=args.rank, lora_alpha=args.alpha, target_modules=["q_proj", "k_proj", "v_proj", "out_proj"]
        )
        text_encoder = get_peft_model(text_encoder, text_encoder_lora_config)
        params_to_train += list(filter(lambda p: p.requires_grad, text_encoder.parameters()))

    optimizer = torch.optim.AdamW(params_to_train, lr=args.learning_rate)

    dataset = ExpressionEditDataset(args.data_dir, args.resolution, tokenizer)
    dataloader = DataLoader(dataset, batch_size=args.train_batch_size, shuffle=True)

    lr_scheduler = get_scheduler(
        "constant", optimizer=optimizer, num_warmup_steps=0, num_training_steps=args.max_train_steps
    )

    unet, text_encoder, optimizer, dataloader, lr_scheduler = accelerator.prepare(
        unet, text_encoder, optimizer, dataloader, lr_scheduler
    )
    vae.to(accelerator.device, dtype=torch.float32)
    if not args.train_text_encoder:
        text_encoder.to(accelerator.device, dtype=torch.float32)

    global_step = 0
    progress_bar = tqdm(range(args.max_train_steps), disable=not accelerator.is_local_main_process)
    progress_bar.set_description("LoRA training steps")

    output_dir = ROOT / "models" / "loras" / args.output_name
    output_dir.mkdir(parents=True, exist_ok=True)

    while global_step < args.max_train_steps:
        for batch in dataloader:
            with accelerator.accumulate(unet):
                latents = vae.encode(batch["pixel_values"].to(dtype=torch.float32)).latent_dist.sample()
                latents = latents * vae.config.scaling_factor

                noise = torch.randn_like(latents)
                bsz = latents.shape[0]
                timesteps = torch.randint(
                    0, noise_scheduler.config.num_train_timesteps, (bsz,), device=latents.device
                ).long()
                noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)

                encoder_hidden_states = text_encoder(batch["input_ids"])[0]

                model_pred = unet(noisy_latents, timesteps, encoder_hidden_states).sample
                loss = F.mse_loss(model_pred.float(), noise.float(), reduction="mean")

                accelerator.backward(loss)
                if accelerator.sync_gradients:
                    accelerator.clip_grad_norm_(params_to_train, 1.0)
                optimizer.step()
                lr_scheduler.step()
                optimizer.zero_grad()

            if accelerator.sync_gradients:
                global_step += 1
                progress_bar.update(1)
                progress_bar.set_postfix(loss=loss.detach().item())

                if global_step % args.checkpointing_steps == 0 and accelerator.is_main_process:
                    _save_lora(accelerator, unet, text_encoder if args.train_text_encoder else None, output_dir)
                    print(f"\nCheckpoint saved at step {global_step} -> {output_dir}")

                if global_step >= args.max_train_steps:
                    break

    if accelerator.is_main_process:
        _save_lora(accelerator, unet, text_encoder if args.train_text_encoder else None, output_dir)
        print(f"\nDone. LoRA saved to {output_dir}")
        print(f"Set lora.default_lora_name: \"{args.output_name}\" in config.yaml to use it by default,")
        print(f"or pass lora_name=\"{args.output_name}\" on POST /api/generate.")


def _save_lora(accelerator, unet, text_encoder, output_dir: Path):
    unwrapped_unet = accelerator.unwrap_model(unet)
    unet_lora_state_dict = {
        k: v for k, v in unwrapped_unet.state_dict().items() if "lora" in k
    }

    from diffusers import StableDiffusionPipeline

    save_kwargs = {"unet_lora_layers": unet_lora_state_dict}
    if text_encoder is not None:
        unwrapped_te = accelerator.unwrap_model(text_encoder)
        te_lora_state_dict = {k: v for k, v in unwrapped_te.state_dict().items() if "lora" in k}
        save_kwargs["text_encoder_lora_layers"] = te_lora_state_dict

    StableDiffusionPipeline.save_lora_weights(save_directory=str(output_dir), **save_kwargs)


if __name__ == "__main__":
    main()
