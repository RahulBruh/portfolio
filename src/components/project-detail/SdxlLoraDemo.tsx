"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type JobStatus = "idle" | "submitting" | "queued" | "running" | "done" | "error";

const POLL_INTERVAL_MS = 2500;
const MAX_PROMPT_LENGTH = 500;

const EXAMPLE_PROMPTS = [
  "Cyberpunk city skyline at night, dense futuristic skyscrapers, glowing neon signs in Japanese and English, holographic billboards, rain-slicked streets reflecting pink and cyan light, flying vehicles in the distance, clear crisp air, sharp visibility, cinematic wide shot, highly detailed architecture, volumetric lighting, blade runner aesthetic, 8k, ultra sharp",
];

export default function SdxlLoraDemo() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback((jobId: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/generate-sdxl/status/${jobId}`);
        const data = await res.json();

        if (data.status === "COMPLETED" && data.image) {
          setImageUrl(data.image);
          setStatus("done");
          return;
        }
        if (data.status === "FAILED" || data.error) {
          setStatus("error");
          setErrorMessage(data.error || "Generation failed.");
          return;
        }
        setStatus(data.status === "IN_PROGRESS" ? "running" : "queued");
        pollTimer.current = setTimeout(tick, POLL_INTERVAL_MS);
      } catch {
        setStatus("error");
        setErrorMessage("Lost connection while checking generation status.");
      }
    };

    tick();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = prompt.trim();
      if (!trimmed || status === "submitting" || status === "queued" || status === "running") {
        return;
      }

      if (pollTimer.current) clearTimeout(pollTimer.current);
      setStatus("submitting");
      setErrorMessage(null);
      setImageUrl(null);

      try {
        const res = await fetch("/api/generate-sdxl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed }),
        });
        const data = await res.json();
        if (!res.ok || !data.jobId) {
          setStatus("error");
          setErrorMessage(data.error || "Couldn't start generation.");
          return;
        }
        setStatus("queued");
        poll(data.jobId);
      } catch {
        setStatus("error");
        setErrorMessage("Couldn't start generation.");
      }
    },
    [prompt, status, poll]
  );

  const isBusy = status === "submitting" || status === "queued" || status === "running";

  return (
    <div className="border border-border bg-surface p-6 md:p-8">
      <p className="text-xs text-accent tracking-[0.25em] uppercase mb-3 font-code">
        Live Demo
      </p>
      <h2 className="font-display text-2xl font-bold mb-3">Try the LoRA</h2>
      <p className="text-text-muted leading-[1.8] font-light mb-6 max-w-2xl">
        Describe a scene and it&apos;ll be generated with the trained cyberpunk-style LoRA on
        top of SDXL base, running on a RunPod GPU worker. Cold start can take up to a minute if
        the worker has spun down.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
          maxLength={MAX_PROMPT_LENGTH}
          rows={3}
          placeholder="a rooftop garden overlooking a neon skyline..."
          disabled={isBusy}
          className="w-full bg-frame border border-border text-text px-4 py-3 text-sm font-body resize-none focus:outline-none focus:border-accent-border-40 disabled:opacity-60"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              disabled={isBusy}
              onClick={() => setPrompt(example)}
              className="text-xs px-2.5 py-1.5 border border-border text-text-muted font-code transition-colors duration-200 hover:text-accent hover:border-accent-border-40 disabled:opacity-60"
            >
              {example}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isBusy || !prompt.trim()}
            className="flex items-center gap-2 whitespace-nowrap bg-accent text-bg px-5 py-2.5 text-sm font-medium transition-opacity duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isBusy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {isBusy ? "Generating..." : "Generate"}
          </button>
          {status === "queued" && (
            <span className="text-xs text-text-muted font-code">
              queued — cold start can take ~30-60s
            </span>
          )}
          {status === "running" && (
            <span className="text-xs text-text-muted font-code">generating...</span>
          )}
        </div>
      </form>

      {errorMessage && (
        <p className="text-sm mt-4" style={{ color: "#ff6b6b" }}>
          {errorMessage}
        </p>
      )}

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- generated image is a data: URI, not a static asset
        <img
          src={imageUrl}
          alt={prompt || "Generated cyberpunk-style image"}
          className="mt-6 w-full max-w-xl border border-border"
        />
      )}
    </div>
  );
}
