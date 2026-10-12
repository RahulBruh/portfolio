import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jobapplyAuth";
import { fetchJobPosting, JobFetchError } from "@/lib/jobPosting.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store" };

/** Fetch a job posting link for the /jobapply page's "Job link" field; signed-in only. */
export async function GET(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: HEADERS });
  }
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Add a job link first." }, { status: 400, headers: HEADERS });
  try {
    return NextResponse.json(await fetchJobPosting(url), { headers: HEADERS });
  } catch (err) {
    const message = err instanceof JobFetchError ? err.message : "Couldn't load that link. Paste the description instead.";
    return NextResponse.json({ error: message }, { status: 422, headers: HEADERS });
  }
}
