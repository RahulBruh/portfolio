import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Google sign-in gate for /jobapply. Only ALLOWED_EMAIL gets a session.
 *
 * The session is a stateless cookie: base64url(JSON payload) + "." + HMAC-SHA256
 * signature keyed by JOBAPPLY_SESSION_SECRET. Everything fails closed: missing
 * env vars, a bad signature or an expired payload all read as "not signed in".
 */

export const ALLOWED_EMAIL = "rahulbabu.moka@gmail.com";

export const SESSION_COOKIE = "jobapply_session";
export const STATE_COOKIE = "jobapply_oauth_state";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

// Must match the redirect URI registered on the Google OAuth client exactly.
export const CALLBACK_PATH = "/jobapply";

type Session = { email: string; exp: number };

function secret(): string | null {
  const s = process.env.JOBAPPLY_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !secret()) return null;
  return { clientId, clientSecret };
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(data: string, key: string) {
  return b64url(createHmac("sha256", key).update(data).digest());
}

export function createSessionToken(email: string): string {
  const key = secret();
  if (!key) throw new Error("JOBAPPLY_SESSION_SECRET is not set");
  const payload: Session = { email, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const data = b64url(Buffer.from(JSON.stringify(payload)));
  return `${data}.${sign(data, key)}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  const key = secret();
  if (!key || !token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Session;
    if (payload.email !== ALLOWED_EMAIL) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function randomState(): string {
  return b64url(randomBytes(24));
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/jobapply") ? next : "/jobapply";
}
