import { NextResponse, type NextRequest } from "next/server";
import {
  ALLOWED_EMAIL,
  CALLBACK_PATH,
  STATE_COOKIE,
  googleConfig,
  randomState,
  safeNext,
} from "@/lib/jobapplyAuth";

export const runtime = "nodejs";

/** Starts Google sign-in for /jobapply. */
export async function GET(request: NextRequest) {
  const config = googleConfig();
  if (!config) {
    return new NextResponse("Sign-in is not configured on this deployment.", { status: 503 });
  }

  const state = randomState();
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: request.nextUrl.origin + CALLBACK_PATH,
    response_type: "code",
    scope: "openid email",
    state,
    login_hint: ALLOWED_EMAIL,
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(auth);
  res.cookies.set(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: CALLBACK_PATH,
    maxAge: 600,
  });
  return res;
}
