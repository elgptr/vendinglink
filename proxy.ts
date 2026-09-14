import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import {
  resolveRouteProtection,
  type MinimalSession,
} from "@/lib/routeProtection";

const { auth } = NextAuth(authConfig);

export default auth(
  (
    req: NextRequest & {
      auth: { user?: { role?: string; isApproved?: boolean } } | null;
    }
  ) => {
    const { pathname } = req.nextUrl;
    // Pass only the fields the pure decision function needs. `req.auth` is the
    // session as decoded by the NextAuth edge wrapper (null when logged out).
    const session: MinimalSession | null = req.auth ?? null;

    const decision = resolveRouteProtection(pathname, session);

    switch (decision.type) {
      case "next":
        return NextResponse.next();
      case "forbidden":
        return NextResponse.json({ error: decision.message }, { status: 403 });
      case "redirect": {
        const url = new URL(decision.pathname, req.url);
        for (const [key, value] of Object.entries(decision.searchParams)) {
          url.searchParams.set(key, value);
        }
        return NextResponse.redirect(url);
      }
    }
  }
);

// Next.js statically parses the `config` export in proxy/middleware files, so
// the matcher MUST be a literal here (can't be re-exported from another module).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};