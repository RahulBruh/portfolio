FROM pytorch/pytorch:2.7.1-cuda12.8-cudnn9-runtime

WORKDIR /

COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt

# Bake the base model + trained LoRA into the image at build time so cold starts don't need
# to pull several GB over the network on every worker spin-up.
# HF_TOKEN is a build-time-only ARG -- it's read once by download_models.py and never written
# into an image layer or baked into the final image.
ARG HF_TOKEN
ENV HF_HOME=/hf_cache
COPY download_models.py /download_models.py
RUN python /download_models.py

COPY handler.py /handler.py

CMD ["python", "-u", "/handler.py"]
