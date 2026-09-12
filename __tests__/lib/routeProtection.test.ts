import { describe, it, expect } from "vitest";
import { resolveRouteProtection, config } from "@/lib/routeProtection";

/**
 * Unit tests for the pure route-protection decision logic extracted from
 * `proxy.ts`. The NextAuth edge wrapper (module default export) is not invoked
 * here — it depends on web-runtime cookies — so we test the pure function that
 * drives every real decision, covering the full production route matrix.
 *
 * RouteDecision shapes under test:
 *   - { type: "next" }
 *   - { type: "forbidden", message }
 *   - { type: "redirect", pathname, searchParams }
 */

type Session = { user?: { role?: string; isApproved?: boolean } } | null;

const adminSession: Session = { user: { role: "ADMIN" } };
const agentApproved: Session = { user: { role: "AGENT", isApproved: true } };
const agentUnapproved: Session = { user: { role: "AGENT", isApproved: false } };
const noSession: Session = null;

// Proxy.ts always builds redirect URLs from pathname + searchParams, so we
// assert on those instead of a single absolute string (protects the URL base).
function isRedirectTo(
  decision: { type: string },
  expectedPathname: string,
  expectedParams?: Record<string, string>
): void {
  expect(decision.type).toBe("redirect");
  const d = decision as {
    type: "redirect";
    pathname: string;
    searchParams: Record<string, string>;
  };
  expect(d.pathname).toBe(expectedPathname);
  if (expectedParams) {
    expect(d.searchParams).toEqual(expectedParams);
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Public routes                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */

describe("resolveRouteProtection", () => {
  describe("public routes (pass-through)", () => {
    it.each([
      ["/login"],
      ["/register"],
      ["/api/auth/register"],
      ["/api/midtrans/webhook"],
      ["/customer"],
      ["/api/customer"],
      ["/api/customer/order/snap-token"],
      ["/api/checkout/customer"],
      ["/api/promo-codes/validate"],
    ])("%s → next even without a session", (path) => {
      expect(resolveRouteProtection(path, noSession)).toEqual({ type: "next" });
    });

    it.each([
      ["/login"],
      ["/customer"],
      ["/api/customer"],
    ])("%s → next when session present", (path) => {
      expect(resolveRouteProtection(path, agentApproved)).toEqual({
        type: "next",
      });
    });
  });

  /* ── Root "/" ─────────────────────────────────────────────────────────── */

  describe('root "/" redirect', () => {
    it("redirects anonymous users to /customer", () => {
      isRedirectTo(resolveRouteProtection("/", noSession), "/customer", {});
    });

    it("redirects ADMIN to /admin/inventory", () => {
      isRedirectTo(
        resolveRouteProtection("/", adminSession),
        "/admin/inventory",
        {}
      );
    });

    it("redirects AGENT to /agent/catalog", () => {
      isRedirectTo(
        resolveRouteProtection("/", agentApproved),
        "/agent/catalog",
        {}
      );
    });
  });

  /* ── Unauthenticated fallback ─────────────────────────────────────────── */
describe("unauthenticated fallback", () => {
    it.each([
      ["/admin", "/admin"],
      ["/admin/agents", "/admin/agents"],
      ["/agent/catalog", "/agent/catalog"],
      ["/api/order/status", "/api/order/status"],
      ["/api/voucher/validate", "/api/voucher/validate"],
    ])("%s → redirect /login?callbackUrl", (pathname, expectedCb) => {
      const d = resolveRouteProtection(pathname, noSession);
      isRedirectTo(d, "/login", { callbackUrl: expectedCb });
    });
  });
/* ── Admin routes (require ADMIN) ──────────────────────────────────────── */

  describe("admin routes (require ADMIN)", () => {
    describe("API routes → forbidden (403)", () => {
      it.each([
        ["/api/admin/agents"],
        ["/api/admin/products"],
        ["/api/admin/reports"],
        ["/api/admin/stock"],
        ["/api/admin/vouchers"],
        ["/api/admin/products/generate-desc"],
        ["/api/admin/reports/insight"],
      ])("%s → forbidden for non-ADMIN", (path) => {
        const d = resolveRouteProtection(path, agentApproved);
        expect(d.type).toBe("forbidden");
      });

      it("redirects anonymous to /login (before the admin gate runs)", () => {
        const d = resolveRouteProtection("/api/admin/agents", noSession);
        isRedirectTo(d, "/login", { callbackUrl: "/api/admin/agents" });
      });
    });

    describe("page routes → redirect to /agent/catalog", () => {
      it.each([
        ["/admin"],
        ["/admin/agents"],
        ["/admin/inventory"],
        ["/admin/reports"],
        ["/admin/vouchers"],
      ])("%s → /agent/catalog for non-ADMIN session", (path) => {
        isRedirectTo(
          resolveRouteProtection(path, agentApproved),
          "/agent/catalog",
          {}
        );
      });

      it("redirects anonymous to /login (before the admin check runs)", () => {
        const d = resolveRouteProtection("/admin", noSession);
        isRedirectTo(d, "/login", { callbackUrl: "/admin" });
      });
    });

    it("allows ADMIN to pass through (API + page)", () => {
      expect(resolveRouteProtection("/api/admin/agents", adminSession)).toEqual({
        type: "next",
      });
      expect(resolveRouteProtection("/admin/inventory", adminSession)).toEqual({
        type: "next",
      });
    });
  });

  /* ── Agent routes (require approved AGENT) ─────────────────────────────── */

  describe("agent routes (require approved AGENT)", () => {
    describe("API: /api/checkout/agent → forbidden when unapproved", () => {
      it("forbids unapproved AGENT", () => {
        const d = resolveRouteProtection("/api/checkout/agent", agentUnapproved);
        expect(d.type).toBe("forbidden");
      });

      it("allows approved AGENT", () => {
        expect(
          resolveRouteProtection("/api/checkout/agent", agentApproved)
        ).toEqual({ type: "next" });
      });

      it("forbids anonymous (falls through to login redirect)", () => {
        // No session anywhere on a non-public route → /login first.
        const d = resolveRouteProtection("/api/checkout/agent", noSession);
        isRedirectTo(d, "/login", { callbackUrl: "/api/checkout/agent" });
      });
    });

    describe("page: /agent/* → redirect /login?error=unapproved", () => {
      it.each([
        ["/agent/catalog"],
        ["/agent/chat"],
        ["/agent/order/order-123"],
      ])("%s → /login?error=unapproved for unapproved AGENT", (path) => {
        isRedirectTo(
          resolveRouteProtection(path, agentUnapproved),
          "/login",
          { error: "unapproved" }
        );
      });

      it("allows approved AGENT", () => {
        expect(resolveRouteProtection("/agent/catalog", agentApproved)).toEqual({
          type: "next",
        });
      });
    });
  });

  /* ── Other authenticated routes ────────────────────────────────────────── */

  describe("other authenticated routes (pass-through)", () => {
    it.each([
      ["/api/order/status", agentApproved],
      ["/api/order/status", adminSession],
      ["/api/voucher/validate", agentApproved],
      ["/detail/abc", agentApproved],
    ])("%s → next (session: %s)", (path, session) => {
      expect(resolveRouteProtection(path, session)).toEqual({ type: "next" });
    });
  });

  /* ── Boundary conditions ───────────────────────────────────────────────── */

  describe("boundary conditions", () => {
    it("/admins (plural) is treated as an admin route by proxy.ts", () => {
      // The prefix check makes proxy.ts treat /admins like admin; we preserve
      // that behaviour verbatim.
      const d = resolveRouteProtection("/admins", agentApproved);
      expect(d.type).toBe("redirect");
    });

    it("does not treat /api/public as an admin route", () => {
      expect(resolveRouteProtection("/api/public/data", agentApproved)).toEqual({
        type: "next",
      });
    });

    it("session with an undefined role is not ADMIN", () => {
      const d = resolveRouteProtection("/api/admin/agents", { user: {} });
      expect(d.type).toBe("forbidden");
    });
  });

  /* ── Matcher config ────────────────────────────────────────────────────── */

  describe("matcher config", () => {
    it("exports a single matcher string", () => {
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher).toHaveLength(1);
      expect(typeof config.matcher[0]).toBe("string");
    });

    it("excludes Next.js internal paths but keeps protected routes", () => {
      const m = config.matcher[0] as string;
      expect(m).toContain("?!_next/static");
      expect(m).toContain("_next/image");
      expect(m).toContain("favicon.ico");
      expect(m).toContain("api/auth");
    });
  });
});