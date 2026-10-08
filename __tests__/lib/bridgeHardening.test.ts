import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// next-auth beta can't be resolved by Vitest's ESM loader (see auth.test.ts),
// so stub lib/auth with an equivalent getClientIp.
vi.mock("@/lib/auth", () => ({
  getClientIp: (r: NextRequest) =>
    r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    r.headers.get("x-real-ip") ||
    "anonymous",
}));

import { isBridgeIpAllowed, normalizeIp, parseAllowedIps } from "@/lib/bridge/ipAllowlist";
import { bridgeLimiter, checkBridgeRateLimit, BRIDGE_DEFAULT_MAX_REQUESTS } from "@/lib/bridge/rateLimit";

function req(ip: string) {
  return new NextRequest("http://localhost/api/bridge/webhook/stock/topup", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("bridge IP allowlist", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("normalizes IPv6-mapped IPv4 and parses list", () => {
    expect(normalizeIp("::ffff:43.1.2.3")).toBe("43.1.2.3");
    expect(parseAllowedIps(" 43.1.2.3, ,10.0.0.1 ")).toEqual(["43.1.2.3", "10.0.0.1"]);
  });

  it.skip("allows listed IP and rejects others", () => {
    vi.stubEnv("BRIDGE_ALLOWED_IPS", "43.1.2.3");
    expect(isBridgeIpAllowed(req("43.1.2.3"))).toBe(true);
    expect(isBridgeIpAllowed(req("::ffff:43.1.2.3"))).toBe(true);
    expect(isBridgeIpAllowed(req("8.8.8.8"))).toBe(false);
  });

  it.skip("denies all in production when unset", () => {
    vi.stubEnv("BRIDGE_ALLOWED_IPS", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(isBridgeIpAllowed(req("43.1.2.3"))).toBe(false);
  });

  it("allows all outside production when unset", () => {
    vi.stubEnv("BRIDGE_ALLOWED_IPS", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isBridgeIpAllowed(req("1.2.3.4"))).toBe(true);
  });
});

describe("bridge rate limit", () => {
  beforeEach(() => bridgeLimiter.reset());

  it("allows 30/min then returns 429 with Retry-After", () => {
    for (let i = 0; i < BRIDGE_DEFAULT_MAX_REQUESTS; i++) {
      expect(checkBridgeRateLimit(req("43.1.2.3")).allowed).toBe(true);
    }
    const blocked = checkBridgeRateLimit(req("43.1.2.3"));
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.response.status).toBe(429);
      expect(blocked.response.headers.get("Retry-After")).toBe("60");
    }
  });

  it("tracks each IP in its own bucket", () => {
    for (let i = 0; i < BRIDGE_DEFAULT_MAX_REQUESTS; i++) checkBridgeRateLimit(req("43.1.2.3"));
    expect(checkBridgeRateLimit(req("10.0.0.1")).allowed).toBe(true);
  });
});
