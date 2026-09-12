import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username dan password wajib diisi");
        }

        const username = String(credentials.username).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          throw new Error("Username atau password salah");
        }

        if (!user.isActive) {
          throw new Error("Akun Anda telah dinonaktifkan. Hubungi admin.");
        }

        if (user.role === "AGENT" && !user.isApproved) {
          throw new Error("Akun agen Anda belum disetujui admin.");
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error("Username atau password salah");
        }

        return {
          id: user.id,
          name: user.username,
          role: user.role,
          isApproved: user.isApproved,
        };
      },
    }),
  ],
});

// ── Route-handler helpers (Node runtime only) ──────────────────────────────
// These are for use inside API route handlers, NOT in edge middleware.

import type { NextRequest } from "next/server";

/**
 * Extract client IP from request headers.
 * Respects the `X-Forwarded-For` header (set by reverse proxies / load balancers).
 * Falls back to `x-real-ip`, then `"anonymous"`.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

/**
 * Require a valid session with ADMIN role.
 * Returns the session object when authorised, `null` otherwise.
 */
export async function requireAdminSession() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

/**
 * Require a valid session with AGENT role AND approved status.
 * Returns the session object when authorised, `null` otherwise.
 */
export async function requireApprovedAgentSession() {
  const session = await auth();
  if (
    !session ||
    session.user.role !== "AGENT" ||
    session.user.isApproved !== true
  ) {
    return null;
  }
  return session;
}

// Type augmentation
declare module "next-auth" {
  interface User {
    role: string;
    isApproved?: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      isApproved?: boolean;
    };
  }
}

import type { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT extends Record<string, unknown> {
    role: string;
    isApproved?: boolean;
  }
}
