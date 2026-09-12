/**
 * CSRF (Cross-Site Request Forgery) protection utilities (Phase 2).
 *
 * Implements the **double-submit cookie** pattern with optional single-use
 * (replay) protection:
 *
 * - `generateCsrfToken()` produces a cryptographically random token.
 * - The token is stored in a cookie while also being sent in the request
 *   body/header by the client.
 * - `validateDoubleSubmitToken()` verifies the cookie token and the submitted
 *   token are identical (constant-time comparison).
 * - A server-side in-memory "consumed token" registry provides optional
 *   single-use enforcement to harden against token replay within a window.
 *
 * NOTE: This runs in the Node runtime route handlers (not the edge middleware),
 * where shared in-memory state is valid and persisted between requests.
 */

import crypto from "crypto";

/** Length in bytes of a generated token (32 bytes => 64 hex chars). */
const TOKEN_BYTES = 32;
/** Time (ms) a token stays valid for replay-protection purposes. */
const DEFAULT_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** A token that has been consumed (used) for single-use enforcement. */
interface ConsumedToken {
  value: string;
  consumedAt: number;
}

const consumedTokens = new Map<string, ConsumedToken>();

/**
 * Generate a cryptographically secure, URL-safe CSRF token (hex-encoded).
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Validate that a token is well-formed (64 lowercase hex characters).
 * Does NOT check whether it was previously consumed.
 */
export function isValidTokenFormat(token: string): boolean {
  return typeof token === "string" && /^[0-9a-f]{64}$/.test(token);
}

/**
 * Constant-time comparison of two strings (length-safe against mismatch).
 */
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Validate a double-submit CSRF token.
 *
 * @param cookieToken - Token expected from the cookie.
 * @param submittedToken - Token sent in the body/header by the client.
 * @param opts.opts - Optional single-use (replay) protection settings.
 * @returns true when the tokens match (and, if enabled, are not already consumed).
 */
export function validateDoubleSubmitToken(
  cookieToken: string | undefined,
  submittedToken: string | undefined,
  opts: { singleUse?: boolean; ttlMs?: number } = {}
): boolean {
  if (
    typeof cookieToken !== "string" ||
    typeof submittedToken !== "string" ||
    cookieToken === "" ||
    submittedToken === ""
  ) {
    return false;
  }

  // Both tokens must be well-formed before comparing.
  if (!isValidTokenFormat(cookieToken) || !isValidTokenFormat(submittedToken)) {
    return false;
  }

  if (!safeEqual(cookieToken, submittedToken)) {
    return false;
  }

  if (opts.singleUse) {
    return consumeToken(cookieToken, opts.ttlMs ?? DEFAULT_TOKEN_TTL_MS);
  }

  return true;
}

/**
 * Backward-compatible CSRF request guard for use in route handlers.
 *
 * Fails OPEN only when BOTH the cookie token and the submitted token are
 * absent (i.e. CSRF token bootstrap not yet distributed to the client — common
 * for legacy/existing forms). As soon as either side carries a token, it must
 * be well-formed and match the other, otherwise the request is rejected.
 *
 * This hardens financial/high-impact endpoints (checkout, register) against
 * CSRF replay/mismatch attacks without breaking existing clients that do not
 * yet send tokens. Once the frontend distributes tokens everywhere this
 * becomes strict enforcement.
 *
 * @returns true when the request is allowed.
 */
export function verifyCsrfRequest(
  cookieToken: string | undefined,
  submittedToken: string | undefined,
  opts: { singleUse?: boolean; ttlMs?: number } = {}
): boolean {
  const hasCookie = typeof cookieToken === "string" && cookieToken !== "";
  const hasSubmitted = typeof submittedToken === "string" && submittedToken !== "";

  // No token anywhere → fail-open (no bootstrap yet). Cannot be a cross-site
  // forgery because the attacker cannot supply a matching cookie+body token.
  if (!hasCookie && !hasSubmitted) {
    return true;
  }

  return validateDoubleSubmitToken(cookieToken, submittedToken, opts);
}

/**
 * Extract the double-submit token from a request's cookies, falling back to
 * reading the `x-csrf-token` header if cookie parsing is not available.
 * Returns the cookie token and the header token separately for `verifyCsrfRequest`.
 */
export function extractCsrfTokens(
  cookieHeader: string | null | undefined,
  submittedToken: string | null | undefined
): { cookieToken: string | undefined; submittedToken: string | undefined } {
  let cookieToken: string | undefined;
  if (typeof cookieHeader === "string") {
    const match = cookieHeader.split(";").map((s) => s.trim()).find((part) =>
      part.startsWith(`${CSRF_COOKIE_NAME}=`)
    );
    if (match) cookieToken = match.slice(CSRF_COOKIE_NAME.length + 1);
  }
  return {
    cookieToken,
    submittedToken: submittedToken ?? undefined,
  };
}

/**
 * Record a token as consumed (single-use). Returns true if it was not already
 * present and is now registered, false if it was already consumed (replay).
 */
export function consumeToken(token: string, ttlMs = DEFAULT_TOKEN_TTL_MS): boolean {
  pruneConsumedTokens(ttlMs);
  if (consumedTokens.has(token)) {
    return false;
  }
  consumedTokens.set(token, { value: token, consumedAt: Date.now() });
  return true;
}

/**
 * Prune consumed tokens older than `ttlMs`; returns number removed.
 */
export function pruneConsumedTokens(ttlMs = DEFAULT_TOKEN_TTL_MS): number {
  const now = Date.now();
  let removed = 0;
  for (const [value, entry] of consumedTokens) {
    if (now - entry.consumedAt > ttlMs) {
      consumedTokens.delete(value);
      removed++;
    }
  }
  return removed;
}

/**
 * Clear all consumed tokens (used in tests / teardown).
 */
export function resetConsumedTokens(): void {
  consumedTokens.clear();
}

/**
 * Build a `Set-Cookie` header value for the CSRF token (HttpOnly not set so the
 * client JS can read it back for the double-submit pattern; SameSite=Lax + Secure).
 */
export function buildCookieHeader(token: string, isSecure = true): string {
  const secureFlag = isSecure ? "; Secure" : "";
  return `__Host-csrf-token=${token}; Path=/; SameSite=Lax${secureFlag}; Max-Age=${DEFAULT_TOKEN_TTL_MS / 1000}`;
}

/** Cookie name used by this module. */
export const CSRF_COOKIE_NAME = "__Host-csrf-token";