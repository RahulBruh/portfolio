import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RESUME_PATH = path.join(process.cwd(), "public/assets/Rahul_AI.pdf");

export async function GET() {
  const file = await readFile(RESUME_PATH);

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Rahul_AI.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
