"""Build-time step: pulls the base checkpoint + trained LoRA into the image so cold starts
don't hit the network. Run once during `docker build`, not at request time.
"""
import os

from huggingface_hub import snapshot_download

BASE_MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
LORA_REPO_ID = os.environ.get("LORA_REPO_ID", "BRUHCUH/sdxl-cyberpunk-lora")


def main():
    token = os.environ.get("HF_TOKEN") or None
    snapshot_download(
        BASE_MODEL_ID,
        allow_patterns=["*.json", "*fp16*", "*.txt", "tokenizer*/*", "tokenizer_2*/*"],
        token=token,
    )
    snapshot_download(LORA_REPO_ID, token=token)


if __name__ == "__main__":
    main()
