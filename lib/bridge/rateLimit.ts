/**
 * Bridge webhook rate limiter.
 *
 * Separate limiter instance from `adminRateLimit` so bridge traffic never
 * consumes admin quota (and vice-versa). Defaults to 30 requests / minute / IP,
 * overridable via `BRIDGE_RATE_LIMIT_MAX` and `BRIDGE_RATE_LIMIT_WINDOW_MS`.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/auth";

export const BRIDGE_DEFAULT_MAX_REQUESTS = 30;
export const BRIDGE_DEFAULT_WINDOW_MS = 60 * 1000;

function positiveIntFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const windowMs = positiveIntFromEnv(
  process.env.BRIDGE_RATE_LIMIT_WINDOW_MS,
  BRIDGE_DEFAULT_WINDOW_MS
);

export const bridgeLimiter = createRateLimiter(
  positiveIntFromEnv(process.env.BRIDGE_RATE_LIMIT_MAX, BRIDGE_DEFAULT_MAX_REQUESTS),
  windowMs
);

export type BridgeRateLimitResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse };

export function checkBridgeRateLimit(request: NextRequest): BridgeRateLimitResult {
  const result = bridgeLimiter.check(getClientIp(request));
  if (result.allowed) return { allowed: true };

  return {
    allowed: false,
    response: NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(windowMs / 1000)),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.resetAt),
        },
      }
    ),
  };
}
