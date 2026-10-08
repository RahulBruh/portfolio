import { readFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { handleGoogleCallback } from "@/lib/googleCallback";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jobapplyAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_PATH = path.join(process.cwd(), "private/jobapply/page.html");

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

const ERRORS: Record<string, string> = {
  denied: "That Google account doesn't have access.",
  state: "The sign-in link expired. Try again.",
  token: "Google sign-in failed. Try again.",
  config: "Sign-in isn't configured on this deployment yet.",
  access_denied: "Sign-in was cancelled.",
};

export async function GET(request: NextRequest) {
  // This route doubles as the OAuth redirect URI registered with Google.
  if (request.nextUrl.searchParams.has("code")) return handleGoogleCallback(request);

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) {
    return new NextResponse(await readFile(PAGE_PATH, "utf8"), { headers: HEADERS });
  }
  const error = ERRORS[request.nextUrl.searchParams.get("error") ?? ""] ?? "";
  return new NextResponse(loginPage(error), { status: 401, headers: HEADERS });
}

function loginPage(error: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sign in · Resume Project Bank</title>
<style>
  :root { --bg:#F5F6FA; --surface:#FFFFFF; --ink:#141A2E; --muted:#59627E; --line:#DCE0EC; --danger:#B42318; color-scheme:light; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0D1120; --surface:#151A2B; --ink:#E7EAF4; --muted:#97A0BC; --line:#283050; --danger:#FF8A80; color-scheme:dark; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:16px; background:var(--bg); color:var(--ink);
         font:15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  .card { width:100%; max-width:380px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:28px; text-align:center; }
  h1 { font-size:22px; margin:0 0 6px; }
  p { margin:0 0 20px; color:var(--muted); }
  .err { color:var(--danger); margin:0 0 16px; }
  a.btn { display:inline-flex; align-items:center; gap:10px; padding:10px 18px; border:1px solid var(--line); border-radius:8px;
          background:var(--surface); color:var(--ink); text-decoration:none; font-weight:500; }
  a.btn:hover { border-color:var(--muted); }
</style>
</head>
<body>
  <main class="card">
    <h1>Resume Project Bank</h1>
    <p>Private page. Sign in to continue.</p>
    ${error ? `<p class="err" role="alert">${error}</p>` : ""}
    <a class="btn" href="/api/auth/google?next=/jobapply">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      Sign in with Google
    </a>
  </main>
</body>
</html>`;
}
