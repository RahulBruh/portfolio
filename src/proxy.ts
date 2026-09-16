import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * The AI Services page first shipped at `/RAG`, and page routes are
 * case-sensitive, so every other spelling 404s — including the `/rag` most
 * people type and the `/Rag` a phone keyboard autocapitalises into. Send them
 * all to the real lowercase route.
 *
 * The matcher spells out the casings itself: a plain `/RAG` matcher only
 * matches that exact spelling. The equality check below is what stops the
 * canonical `/rag` from redirecting to itself.
 *
 * Note this is deliberately not a `redirects()` entry in next.config.ts —
 * redirect `source` matching *is* case-insensitive, so a `/RAG` source also
 * catches `/rag` and sends the real route into a redirect loop.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/rag") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/rag";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/:segment([Rr][Aa][Gg])",
};
