import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/jobapplyAuth";

/** Ends the /jobapply session. POST-only so a link elsewhere can't sign you out. */
export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(`${request.nextUrl.origin}/jobapply`, 303);
  res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return res;
}
