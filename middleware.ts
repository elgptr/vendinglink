import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userRole = session?.user?.role;

  // ─── Public routes (no auth needed) ───────────────────────────────────────
  const publicRoutes = ["/login", "/api/midtrans/webhook"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
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

  // ─── Root redirect ────────────────────────────────────────────────────────
  if (pathname === "/") {
    if (userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/inventory", req.url));
    }
    return NextResponse.redirect(new URL("/agent/catalog", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
