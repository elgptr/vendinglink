import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createRateLimiter,
  DEFAULT_LIMITS,
  type RateLimiter,
} from "@/lib/rateLimit";

describe("lib/rateLimit.ts", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = createRateLimiter(3, 1000); // 3 requests per 1000ms window
  });

  afterEach(() => {
    vi.useRealTimers();
    limiter.reset();
  });

  it("allows requests under the limit", () => {
    const r1 = limiter.check("ip-1");
    const r2 = limiter.check("ip-1");
    const r3 = limiter.check("ip-1");

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
  });

  it("denies requests at the limit boundary", () => {
    limiter.check("ip-1");
    limiter.check("ip-1");
    limiter.check("ip-1"); // 3rd hits the limit

    const denied = limiter.check("ip-1");
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it("refreshes the window after expiry", () => {
    limiter.check("ip-1");
    limiter.check("ip-1");
    limiter.check("ip-1"); // limit reached

    const denied = limiter.check("ip-1");
    expect(denied.allowed).toBe(false);

    // Advance time beyond the window.
    vi.advanceTimersByTime(1500);
    const refreshed = limiter.check("ip-1");
    expect(refreshed.allowed).toBe(true);
  });

  it("treats different keys independently", () => {
    // Exhaust ip-1
    for (let i = 0; i < 4; i++) limiter.check("ip-1");

    // ip-2 should be unaffected
    const first = limiter.check("ip-2");
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it("prunes expired entries and resets state", () => {
    limiter.check("a");
    limiter.check("b");

    expect(limiter.size()).toBe(2);

    vi.advanceTimersByTime(5000);
    const removed = limiter.pruneExpired();
    expect(removed).toBe(2);
    expect(limiter.size()).toBe(0);

    limiter.reset();
    expect(limiter.size()).toBe(0);
  });

  it("throws on invalid configuration", () => {
    expect(() => createRateLimiter(0, 1000)).toThrow();
    expect(() => createRateLimiter(5, -1)).toThrow();
  });

  it("throws on empty key", () => {
    expect(() => limiter.check("")).toThrow();
  });

  it("exposes sensible default public-endpoint limits", () => {
    expect(DEFAULT_LIMITS.register.maxRequests).toBe(5);
    expect(DEFAULT_LIMITS.checkout.maxRequests).toBe(20);
    expect(DEFAULT_LIMITS.general.maxRequests).toBe(100);
  });
});