import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RUNPOD_BASE_URL = process.env.RUNPOD_BASE_URL || "https://api.runpod.ai";
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_SDXL_ENDPOINT_ID = process.env.RUNPOD_SDXL_ENDPOINT_ID;

const JOB_ID_RE = /^[a-zA-Z0-9-]+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  if (!RUNPOD_API_KEY || !RUNPOD_SDXL_ENDPOINT_ID) {
    return NextResponse.json(
      { error: "Image generation is not configured yet." },
      { status: 503 }
    );
  }

  const { jobId } = await params;
  if (!JOB_ID_RE.test(jobId)) {
    return NextResponse.json({ error: "Invalid job id." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${RUNPOD_BASE_URL}/v2/${RUNPOD_SDXL_ENDPOINT_ID}/status/${jobId}`,
      { headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Status check failed." }, { status: 502 });
    }
    const data = await res.json();

    if (data.status === "COMPLETED") {
      const output = data.output || {};
      if (output.error) {
        return NextResponse.json({ status: "FAILED", error: output.error });
      }
      if (!output.image_base64) {
        return NextResponse.json({ status: "FAILED", error: "No image returned." });
      }
      return NextResponse.json({
        status: "COMPLETED",
        image: `data:image/png;base64,${output.image_base64}`,
      });
    }

    if (["FAILED", "CANCELLED", "TIMED_OUT"].includes(data.status)) {
      return NextResponse.json({
        status: "FAILED",
        error: `Generation ${String(data.status).toLowerCase()}.`,
      });
    }

    return NextResponse.json({ status: data.status || "IN_QUEUE" });
  } catch {
    return NextResponse.json({ error: "Status check failed." }, { status: 502 });
  }
}
