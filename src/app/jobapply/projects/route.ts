import { readFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jobapplyAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_PATH = path.join(process.cwd(), "private/jobapply/projects.json");

/** Seed project list for the /jobapply page; signed-in only. */
export async function GET(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return new NextResponse(await readFile(DATA_PATH, "utf8"), {
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}
