# RunPod Serverless Worker — Cyberpunk SDXL LoRA

Serverless worker backing the portfolio's live image-generation demo
(`src/app/api/generate-sdxl`), on its own dedicated RunPod account/API key. This is a copy of
the worker originally developed in the sibling `sdxl-cyberpunk-lora` project — keep the two in
sync if the handler changes there.

## What it runs

- Base: `stabilityai/stable-diffusion-xl-base-1.0`
- LoRA: [`BRUHCUH/sdxl-cyberpunk-lora`](https://huggingface.co/BRUHCUH/sdxl-cyberpunk-lora)
- Both are baked into the image at build time (`download_models.py`) so cold starts don't
  re-download several GB per worker spin-up.

## 1. Build

Requires Docker and a Hugging Face token with access to
`stabilityai/stable-diffusion-xl-base-1.0` — accept the license on the model page first
(https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0), then create a token at
https://huggingface.co/settings/tokens (read access is enough).

```powershell
cd portfolio/runpod_worker
docker build --platform linux/amd64 --build-arg HF_TOKEN=hf_xxx -t <dockerhub-username>/sdxl-cyberpunk-lora-worker:v1 .
```

This downloads several GB during the build — expect the first build to take a while.
`HF_TOKEN` is a build-time-only `ARG`; it's read once by `download_models.py` and never
written into an image layer or left in the final image.

## 2. Push

```powershell
docker login
docker push <dockerhub-username>/sdxl-cyberpunk-lora-worker:v1
```

Any registry works (Docker Hub, GHCR, etc.) — use whichever you're already logged into.

## 3. Deploy on RunPod

1. https://www.runpod.io/console/serverless → **New Endpoint** → **Custom Source** → **Docker Image**.
2. Image: `<dockerhub-username>/sdxl-cyberpunk-lora-worker:v1`.
3. GPU: a 16GB+ card (RTX 4090 / L4 / A5000 tier) — SDXL fp16 needs roughly 10–12GB VRAM at
   runtime.
4. Leave everything else default. No extra env vars are required unless you want to override
   `LORA_REPO_ID`.
5. Deploy, then copy the **Endpoint ID** RunPod assigns.

## 4. Wire it into the portfolio

In `portfolio/.env.local`:

```
RUNPOD_API_KEY=<your key>
RUNPOD_SDXL_ENDPOINT_ID=<endpoint id from step 3>
```

Restart the dev/prod server after setting these — `/api/generate-sdxl` checks both at request
time and returns 503 ("Image generation is not configured yet.") if either is missing.

## Test locally without deploying

RunPod's Python SDK supports a local test mode:

```powershell
docker run --gpus all <dockerhub-username>/sdxl-cyberpunk-lora-worker:v1 --test_input "{\"input\": {\"prompt\": \"a lone samurai in a neon alley\"}}"
```

## Cost note

RunPod serverless only charges while a job is actually running; check your endpoint's min/max
worker settings on the dashboard if you want to guarantee zero idle cost (min workers = 0)
versus faster response times (min workers ≥ 1, which keeps a worker warm and billing at a low
idle rate). Given this endpoint sits behind a public, unauthenticated demo, min workers = 0
plus the rate limiting already built into the portfolio's API route is the safer default.
