/**
 * Shared admin-endpoint rate limiter (Phase 2 — Jiwo / Tech Lead).
 *
 * Applies a strict **5 requests / minute / IP** guard to all `/api/admin/**`
 * route handlers. Runs in the Node runtime route handler (in-memory state is
 * valid there) — edge middleware has no shared mutable state, so the middleware
 * delegates rate limiting down to here.
 *
 * Keyed by client IP (via `getClientIp`) so one IP cannot flood admin APIs.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "./rateLimit";
import { getClientIp } from "./auth";

const ADMIN_MAX_REQUESTS = 5; // per window
const ADMIN_WINDOW_MS = 60 * 1000; // 1 minute

// Module-level singleton — shared across requests within one server instance.
const adminLimiter = createRateLimiter(ADMIN_MAX_REQUESTS, ADMIN_WINDOW_MS);

export type AdminRateLimitResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse };

/**
 * Check the admin rate limit for the current request.
 * Returns `{ allowed: false, response }` with a 429 JSON and rate-limit
 * headers when the client IP has exceeded 5 requests/min.
 */
export function checkAdminRateLimit(
  request: NextRequest
): AdminRateLimitResult {
  const ip = getClientIp(request);
  const result = adminLimiter.check(ip);

  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.resetAt),
          },
        }
      ),
    };
  }

  return { allowed: true };
}