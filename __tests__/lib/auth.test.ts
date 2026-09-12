import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for the route-handler auth helpers.
 *
 * `getClientIp` is tested directly. `requireAdminSession` and
 * `requireApprovedAgentSession` depend on `lib/auth.ts`'s `auth()` function.
 *
 * next-auth 5.0.0-beta.32 imports "next/server" (no `.js` extension), which
 * Next 16 does not expose under Node's ESM resolver — so it only fails under
 * Vitest, not Next's bundler. To keep these tests self-contained we mock the
 * whole `next-auth` module (and its direct transitive deps used by auth.ts)
 * instead of importing the real next-auth runtime.
 */

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { getClientIp, requireAdminSession, requireApprovedAgentSession } from "@/lib/auth";
import { auth as authMock } from "@/lib/auth";

const mockedAuth = authMock as unknown as ReturnType<typeof vi.fn>;

function makeReq(headers: Record<string, string | null> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
  } as unknown as Parameters<typeof getClientIp>[0];
}

describe("getClientIp", () => {
  it("returns the first X-Forwarded-For entry trimmed", () => {
    const ip = getClientIp(
      makeReq({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" })
    );
    expect(ip).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(makeReq({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2"
    );
  });

  it("falls back to anonymous when no header is present", () => {
    expect(getClientIp(makeReq({}))).toBe("anonymous");
  });
});

describe("requireAdminSession", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
  });

  it("returns the session when role is ADMIN", async () => {
    const sessionData = {
      user: { id: "u1", role: "ADMIN" },
      expires: new Date().toISOString(),
    };
    mockedAuth.mockResolvedValue(sessionData);

    await expect(requireAdminSession()).resolves.toEqual(sessionData);
  });

  it("returns null when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);
    await expect(requireAdminSession()).resolves.toBeNull();
  });

  it("returns null when role is not ADMIN", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "u1", role: "AGENT", isApproved: true },
      expires: new Date().toISOString(),
    });
    await expect(requireAdminSession()).resolves.toBeNull();
  });

  it("returns null when user lacks a role", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1" }, expires: "" });
    await expect(requireAdminSession()).resolves.toBeNull();
  });
});

describe("requireApprovedAgentSession", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
  });

  it("returns the session for an approved AGENT", async () => {
    const sessionData = {
      user: { id: "a1", role: "AGENT", isApproved: true },
      expires: new Date().toISOString(),
    };
    mockedAuth.mockResolvedValue(sessionData);

    await expect(requireApprovedAgentSession()).resolves.toEqual(sessionData);
  });

  it("returns null when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);
    await expect(requireApprovedAgentSession()).resolves.toBeNull();
  });

  it("returns null for an unapproved AGENT", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "a1", role: "AGENT", isApproved: false },
      expires: new Date().toISOString(),
    });
    await expect(requireApprovedAgentSession()).resolves.toBeNull();
  });

  it("returns null for an ADMIN", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "u1", role: "ADMIN", isApproved: true },
      expires: new Date().toISOString(),
    });
    await expect(requireApprovedAgentSession()).resolves.toBeNull();
  });

  it("returns null when the role is missing", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "u1", isApproved: true }, expires: "" });
    await expect(requireApprovedAgentSession()).resolves.toBeNull();
  });
});