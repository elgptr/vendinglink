import { NextResponse } from "next/server";
import { generateCsrfToken, buildCookieHeader } from "@/lib/csrf";

/**
 * GET /api/csrf
 *
 * Distributes a fresh double-submit CSRF token to the client (Task A — form
 * token distribution):
 *
 *   - Returns the token in the JSON body so the frontend can attach it as the
 *     `x-csrf-token` header on state-changing POSTs (checkout, register, etc.).
 *   - Sets the same token in the `__Host-csrf-token` cookie. The server's CSRF
 *     guard (`extractCsrfTokens` + `verifyCsrfRequest`) compares the submitted
 *     header against the cookie to reject cross-site forgery.
 *
 * The endpoint is intentionally PUBLIC (see `PUBLIC_ROUTES` in
 * `lib/routeProtection.ts`) so a brand-new, unauthenticated visitor can obtain
 * a token before checkout. Generating a fresh token on every call is safe for
 * the double-submit pattern: clients always submit the token returned here, so
 * it always matches the freshly issued cookie.
 *
 * No shared server-side state is used, so this is safe in serverless/edge
 * deployments (tokens are validated purely by cookie-header equality).
 */
export function GET() {
  const token = generateCsrfToken();

  // `buildCookieHeader` defaults to the `Secure` flag. That is required by the
  // `__Host-` cookie prefix and is accepted by browsers over `http://localhost`
  // (a secure context), so development on localhost works out of the box.
  const response = NextResponse.json({ token });
  response.headers.set("Set-Cookie", buildCookieHeader(token));

  // Never cache — each visit must receive its own token.
  response.headers.set("Cache-Control", "no-store");
  return response;
}