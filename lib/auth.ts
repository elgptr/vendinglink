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

        // Jika Anda ingin check isApproved, pastikan kolomnya ada dan dicek:
        // if (user.role === "AGENT" && !user.isApproved) {
        //   throw new Error("Akun agen Anda belum disetujui admin.");
        // }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error("Username atau password salah");
        }

        return {
          id: user.id,
          name: user.username,
          role: user.role,
        };
      },
    }),
  ],
});

// Type augmentation
declare module "next-auth" {
  interface User {
    role: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

import type { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT extends Record<string, unknown> {
    role: string;
  }
}
