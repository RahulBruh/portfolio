"""RunPod serverless handler for the cyberpunk SDXL LoRA image generator.

Bakes in stabilityai/stable-diffusion-xl-base-1.0 plus the BRUHCUH/sdxl-cyberpunk-lora adapter
trained in the sibling sdxl-cyberpunk-lora project. It's meant to sit behind an unauthenticated
public demo, so prompt length, step count, and LoRA scale are all clamped server-side regardless
of what the caller sends -- the caller (this repo's /api/generate-sdxl route) has its own checks
too, but this is the last line of defense against a directly-called endpoint.
"""
import base64
import io
import os

import runpod
import torch
from diffusers import StableDiffusionXLPipeline

BASE_MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
LORA_REPO_ID = os.environ.get("LORA_REPO_ID", "BRUHCUH/sdxl-cyberpunk-lora")
TRIGGER_TOKEN = "in cbrpnk style"

NEGATIVE_PROMPT = (
    "lowres, worst quality, low quality, blurry, deformed, disfigured, extra limbs, "
    "watermark, signature, text, jpeg artifacts"
)

MAX_PROMPT_LENGTH = 300
MIN_STEPS, MAX_STEPS, DEFAULT_STEPS = 15, 40, 30
MIN_SCALE, MAX_SCALE, DEFAULT_SCALE = 0.0, 1.2, 0.8
GUIDANCE_SCALE = 7.5

_pipe = None


def _pipeline():
    global _pipe
    if _pipe is None:
        pipe = StableDiffusionXLPipeline.from_pretrained(
            BASE_MODEL_ID, torch_dtype=torch.float16, variant="fp16",
        ).to("cuda")
        pipe.load_lora_weights(LORA_REPO_ID)
        pipe.set_progress_bar_config(disable=True)
        _pipe = pipe
    return _pipe


def _clamp(value, lo, hi, default):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, value))


def handler(job):
    job_input = job.get("input") or {}
    prompt = (job_input.get("prompt") or "").strip()
    if not prompt:
        return {"error": "prompt is required"}
    if len(prompt) > MAX_PROMPT_LENGTH:
        return {"error": f"prompt too long (max {MAX_PROMPT_LENGTH} characters)"}

    full_prompt = prompt if TRIGGER_TOKEN in prompt else f"{prompt}, {TRIGGER_TOKEN}"
    steps = int(_clamp(job_input.get("steps"), MIN_STEPS, MAX_STEPS, DEFAULT_STEPS))
    lora_scale = _clamp(job_input.get("lora_scale"), MIN_SCALE, MAX_SCALE, DEFAULT_SCALE)
    seed = job_input.get("seed")

    generator = None
    if seed is not None:
        try:
            generator = torch.Generator(device="cuda").manual_seed(int(seed))
        except (TypeError, ValueError):
            generator = None

    pipe = _pipeline()
    image = pipe(
        prompt=full_prompt,
        negative_prompt=NEGATIVE_PROMPT,
        num_inference_steps=steps,
        guidance_scale=GUIDANCE_SCALE,
        generator=generator,
        cross_attention_kwargs={"scale": lora_scale},
    ).images[0]

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return {
        "image_base64": base64.b64encode(buf.getvalue()).decode("utf-8"),
        "prompt_used": full_prompt,
    }


runpod.serverless.start({"handler": handler})
