/**
 * Pure route-protection decision logic (Phase 2 — Jiwo / Tech Lead).
 *
 * Extracted from `proxy.ts` into a dependency-free module (no next-auth, no
 * Next.js server APIs, no Prisma) so the exact route matrix is deterministic
 * and fully unit-testable, while `proxy.ts` wires decisions into the edge
 * runtime and maps them to real responses.
 *
 * Behavior is ported verbatim from the original proxy.ts:
 *
 *   - Public routes (customer B2C + auth + webhooks)      → pass-through
 *   - "/" selects landing page by session/role            → redirect
 *   - Any non-public route without a session              → redirect → /login
 *   - /admin* & /api/admin* require ADMIN                 → 403 (API) / redirect (page)
 *   - /agent* & /api/checkout/agent require approval      → 403 (API) / redirect (page)
 *
 * NOTE: Rate limiting is intentionally NOT handled here — edge middleware has
 * no shared mutable state, so admin/agent limits live in the Node runtime
 * route handlers (`lib/adminRateLimit.ts`, and Elang's per-route limiters).
 */

export type RouteDecision =
  | { type: "next" }
  | { type: "forbidden"; message: string }
  | { type: "redirect"; pathname: string; searchParams: Record<string, string> };

export interface MinimalSession {
  user?: {
    role?: string;
    isApproved?: boolean;
  };
}

/* ── Route tables (ported from proxy.ts) ─────────────────────────────────── */

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/api/auth/register",
  "/api/midtrans/webhook",
  "/customer",
  "/api/customer",
  "/api/checkout/customer",
  "/api/promo-codes/validate",
  // CSRF token bootstrap — must remain reachable WITHOUT a session so an
  // unauthenticated customer can obtain a token before checkout.
  "/api/csrf",
];

// Used (like proxy.ts's `pathname.startsWith("/api/")`) to distinguish API
// routes (→ 403 JSON) from page routes (→ redirect) within the admin/agent
// gates. The outer `isAdminRoute` / `isAgentRoute` checks already restrict
// which paths reach it, so this reliably matches proxy.ts behaviour.
const API_PREFIX = "/api";
const AGENT_CHECKOUT_API = "/api/checkout/agent";

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Pure decision function — given a pathname and session, regardless of any
 * Next.js runtime, decide what the proxy should do.
 */
export function resolveRouteProtection(
  pathname: string,
  session: MinimalSession | null
): RouteDecision {
  const userRole = session?.user?.role;
  const isApproved = session?.user?.isApproved;

  // ── Public routes (no auth needed) ──────────────────────────────────────
  if (startsWithAny(pathname, PUBLIC_ROUTES)) {
    return { type: "next" };
  }

  // ── Root path: pick landing page by session/role ────────────────────────
  if (pathname === "/") {
    if (!session) {
      return { type: "redirect", pathname: "/customer", searchParams: {} };
    }
    if (userRole === "ADMIN") {
      return {
        type: "redirect",
        pathname: "/admin/inventory",
        searchParams: {},
      };
    }
    return { type: "redirect", pathname: "/agent/catalog", searchParams: {} };
  }

  // ── Not authenticated → redirect to login ───────────────────────────────
  if (!session) {
    return {
      type: "redirect",
      pathname: "/login",
      searchParams: { callbackUrl: pathname },
    };
  }

  // ── Admin-only routes ───────────────────────────────────────────────────
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminRoute && userRole !== "ADMIN") {
    if (pathname.startsWith(API_PREFIX)) {
      return {
        type: "forbidden",
        message: "Forbidden: Akses admin diperlukan",
      };
    }
    return { type: "redirect", pathname: "/agent/catalog", searchParams: {} };
  }

  // ── Agent-only routes: block unapproved agents ──────────────────────────
  const isAgentRoute = startsWithAny(pathname, [
    "/agent",
    AGENT_CHECKOUT_API,
  ]);

  if (isAgentRoute && userRole === "AGENT") {
    if (!isApproved) {
      if (pathname.startsWith(API_PREFIX)) {
        return {
          type: "forbidden",
          message: "Akun agen Anda belum disetujui admin.",
        };
      }
      return {
        type: "redirect",
        pathname: "/login",
        searchParams: { error: "unapproved" },
      };
    }
  }

  return { type: "next" };
}

/* ── Matcher config (ported from proxy.ts) ──────────────────────────────── */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};