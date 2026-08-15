import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RUNPOD_BASE_URL = process.env.RUNPOD_BASE_URL || "https://api.runpod.ai";
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_SDXL_ENDPOINT_ID = process.env.RUNPOD_SDXL_ENDPOINT_ID;

const MAX_PROMPT_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;

// In-memory per-IP limiter: resets on server restart and isn't shared across instances, so
// it's an abuse deterrent for a public unauthenticated demo, not a security boundary. This
// endpoint has none of the auth/wallet-gating that Amora's equivalent has, so it leans on
// this plus the RunPod worker's own server-side clamps on steps/prompt length instead.
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

// Narrow, fail-closed check for the clearest, highest-severity categories only. This demo
// has none of Amora's auth/age-verification/CSAM-classifier pipeline in front of the same
// kind of image model, so this exists to reject the worst prompts before they ever reach
// generation -- it is not a general content moderation system.
const BLOCKED_TERMS = [
  /\bchild\b/i,
  /\bloli\b/i,
  /\bshota\b/i,
  /\btoddler\b/i,
  /\binfant\b/i,
  /\bunderage\b/i,
  /\bminors?\b/i,
  /\b\d{1,2}\s*(?:yo|y\.o\.|years?[-\s]?old)\b/i,
];

function containsBlockedTerm(text: string): boolean {
  return BLOCKED_TERMS.some((re) => re.test(text));
}

export async function POST(request: NextRequest) {
  if (!RUNPOD_API_KEY || !RUNPOD_SDXL_ENDPOINT_ID) {
    return NextResponse.json(
      { error: "Image generation is not configured yet." },
      { status: 503 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a bit." },
      { status: 429 }
    );
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prompt = (body.prompt || "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters).` },
      { status: 400 }
    );
  }
  if (containsBlockedTerm(prompt)) {
    return NextResponse.json(
      { error: "This prompt can't be generated." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${RUNPOD_BASE_URL}/v2/${RUNPOD_SDXL_ENDPOINT_ID}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: { prompt } }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Image generation request failed." },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data.id) {
      return NextResponse.json(
        { error: "Image generation request failed." },
        { status: 502 }
      );
    }

    return NextResponse.json({ jobId: data.id });
  } catch {
    return NextResponse.json(
      { error: "Image generation request failed." },
      { status: 502 }
    );
  }
}
