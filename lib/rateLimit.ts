/**
 * Shared in-memory rate limiting utility (Phase 2 security hardening).
 *
 * Uses a sliding window counter keyed by an arbitrary string (IP, user id, etc.).
 * Designed to be used inside Node runtime route handlers / server utilities,
 * NOT the Next.js edge middleware (edge has no shared mutable state across
 * requests, so an in-memory Map there would not persist correctly).
 *
 * Pairs with `clearRateLimitExpired()` so entries can be pruned to avoid
 * unbounded memory growth.
 */

export interface RateLimitCheckResult {
  /** Whether the request is allowed to proceed under the current window. */
  allowed: boolean;
  /** Number of remaining requests in the current window (>= 0). */
  remaining: number;
  /** Unix timestamp (ms) when the current window resets. */
  resetAt: number;
}

export interface RateLimiter {
  /** Check + record a hit for `key`. Returns the result of this request. */
  check(key: string): RateLimitCheckResult;
  /** Manually remove all tracked entries (used in tests / teardown). */
  reset(): void;
  /** Prune expired entries; returns number of removed entries. */
  pruneExpired(): number;
  /** Total number of tracked keys (for observability/tests). */
  size(): number;
}

interface Entry {
  timestamps: number[];
}

/**
 * Create a sliding-window rate limiter.
 *
 * @param maxRequests - Maximum number of requests allowed per window.
 * @param windowMs - Sliding window duration in milliseconds.
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number
): RateLimiter {
  if (!Number.isFinite(maxRequests) || maxRequests <= 0) {
    throw new Error("maxRequests must be a positive finite number");
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("windowMs must be a positive finite number");
  }

  const store = new Map<string, Entry>();

  function prune(key: string): void {
    const entry = store.get(key);
    if (!entry) return;
    const now = Date.now();
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }

  return {
    check(key: string): RateLimitCheckResult {
      if (key === "" || key == null) {
        throw new Error("Rate limiter key must be a non-empty string");
      }
      prune(key);

      const now = Date.now();
      const resetAt = now + windowMs;
      const existing = store.get(key);

      if (existing && existing.timestamps.length >= maxRequests) {
        // At/over limit — do not record the hit, deny the request.
        return { allowed: false, remaining: 0, resetAt };
      }

      if (existing) {
        existing.timestamps.push(now);
      } else {
        store.set(key, { timestamps: [now] });
      }

      const remaining = Math.max(0, maxRequests - (store.get(key)!.timestamps.length));
      return { allowed: true, remaining, resetAt };
    },

    reset(): void {
      store.clear();
    },

    pruneExpired(): number {
      const keys = Array.from(store.keys());
      let removed = 0;
      for (const key of keys) {
        const before = store.get(key)?.timestamps.length ?? 0;
        prune(key);
        if (before > 0 && !store.has(key)) removed++;
      }
      return removed;
    },

    size(): number {
      return store.size;
    },
  };
}

/** Default public-endpoint limits (configurable, exported for tests/reuse). */
export const DEFAULT_LIMITS = {
  register: { maxRequests: 5, windowMs: 60 * 1000 }, // 5/min per IP
  checkout: { maxRequests: 20, windowMs: 60 * 1000 }, // 20/min per IP
  general: { maxRequests: 100, windowMs: 60 * 1000 }, // 100/min per IP
} as const;