import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userRole = session?.user?.role;

  // ─── Public routes (no auth needed) ───────────────────────────────────────
  // /customer (pages) and /api/customer, /api/checkout/customer (endpoints)
  // power the public B2C flow — no login required.
  const publicRoutes = [
    "/login",
    "/register",
    "/api/auth/register",
    "/api/midtrans/webhook",
    "/customer",
    "/api/customer",
    "/api/checkout/customer",
  ];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ─── Root path ─────────────────────────────────────────────────────────────
  // Unauthenticated visitors land on the public customer catalog instead of
  // being forced to /login — logging in is only required for Agent/Admin.
  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/customer", req.url));
    }
    if (userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/inventory", req.url));
    }
    return NextResponse.redirect(new URL("/agent/catalog", req.url));
  }

  // ─── Not authenticated → redirect to login ────────────────────────────────
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Admin-only routes ────────────────────────────────────────────────────
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminRoute && userRole !== "ADMIN") {
    // API route → return 403 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Forbidden: Akses admin diperlukan" },
        { status: 403 }
      );
    }
    // Page route → redirect to agent catalog
    return NextResponse.redirect(new URL("/agent/catalog", req.url));
  }

  // ─── Agent-only routes: block unapproved agents ──────────────────────────
  // Agents who have registered but not yet approved by admin are blocked
  // from all /agent/* pages and /api/checkout/agent until admin approves them.
  const isAgentRoute =
    pathname.startsWith("/agent") || pathname.startsWith("/api/checkout/agent");

  if (isAgentRoute && userRole === "AGENT") {
    const isApproved = (session as { user?: { isApproved?: boolean } } | null)
      ?.user?.isApproved;
    if (!isApproved) {
      // API route → return 403 JSON
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Akun agen Anda belum disetujui admin." },
          { status: 403 }
        );
      }
      // Page route → redirect to login with message
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "unapproved");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});



export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
