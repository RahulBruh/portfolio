import { NextResponse, type NextRequest } from "next/server";
import {
  ALLOWED_EMAIL,
  CALLBACK_PATH,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  STATE_COOKIE,
  createSessionToken,
  googleConfig,
  safeNext,
} from "@/lib/jobapplyAuth";

type IdTokenClaims = {
  iss?: string;
  aud?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
};

/**
 * Google redirects back to CALLBACK_PATH (/jobapply) with ?code&state, and that
 * route hands the request here. We check state against the cookie set
 * by /api/auth/google, swap the code for tokens server-to-server, and read the
 * ID token's claims. The ID token comes straight from Google's token endpoint
 * over TLS, so its signature doesn't need separate verification (OIDC Core 3.1.3.7).
 */
export async function handleGoogleCallback(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${origin}/jobapply?error=${reason}`);
    res.cookies.delete({ name: STATE_COOKIE, path: CALLBACK_PATH });
    return res;
  };

  const config = googleConfig();
  if (!config) return fail("config");

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(STATE_COOKIE)?.value ?? "{}");
  } catch {}
  if (!code || !saved.state || params.get("state") !== saved.state) return fail("state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: origin + CALLBACK_PATH,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return fail("token");

  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  let claims: IdTokenClaims = {};
  try {
    claims = JSON.parse(Buffer.from(String(id_token).split(".")[1], "base64url").toString());
  } catch {
    return fail("token");
  }

  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const fresh = typeof claims.exp === "number" && claims.exp > Date.now() / 1000;
  if (!issuerOk || claims.aud !== config.clientId || !fresh) return fail("token");
  if (claims.email?.toLowerCase() !== ALLOWED_EMAIL || claims.email_verified !== true) return fail("denied");

  // safeNext never returns a URL carrying ?code, so this redirect can't loop.
  const res = NextResponse.redirect(origin + safeNext(saved.next ?? null));
  res.cookies.delete({ name: STATE_COOKIE, path: CALLBACK_PATH });
  res.cookies.set(SESSION_COOKIE, createSessionToken(ALLOWED_EMAIL), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
