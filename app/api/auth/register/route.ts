import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sanitizeString } from "@/lib/utils";
import { createRateLimiter } from "@/lib/rateLimit";
import { verifyCsrfRequest, extractCsrfTokens } from "@/lib/csrf";
import { validatePayloadSize } from "@/lib/inputValidation";
import { z } from "zod";

// Shared rate limiter (5 registration attempts / min / IP).
const registerLimiter = createRateLimiter(5, 60 * 1000);

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(30, "Username maksimal 30 karakter")
    .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
  password: z.string().min(6, "Password minimal 6 karakter").max(100),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    // ── Rate limiting ───────────────────────────────────────────────────────
    if (!registerLimiter.check(ip).allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan pendaftaran. Silakan tunggu 1 menit." },
        { status: 429 }
      );
    }

    // ── CSRF guard (fail-open for legacy clients, strict when tokens present) ─
    const { cookieToken, submittedToken } = extractCsrfTokens(
      request.headers.get("cookie"),
      request.headers.get("x-csrf-token")
    );
    if (!verifyCsrfRequest(cookieToken, submittedToken)) {
      return NextResponse.json({ error: "CSRF token tidak valid" }, { status: 403 });
    }

    // ── Payload size guard (prevent oversized memory abuse) ─────────────────
    const contentLength = request.headers.get("content-length");
    const sizeCheck = validatePayloadSize(contentLength ? Number(contentLength) : null);
    if (!sizeCheck.allowed) {
      return NextResponse.json({ error: sizeCheck.reason }, { status: 413 });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: issues }, { status: 400 });
    }

    const username = sanitizeString(parsed.data.username).toLowerCase();

    // Check duplicate username
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "Username sudah digunakan. Silakan pilih username lain." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "AGENT",
        isApproved: false,
        isActive: true,
        outstandingDebt: 0,
      },
      select: {
        id: true,
        username: true,
        role: true,
        isApproved: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Pendaftaran berhasil! Akun agen Anda memerlukan persetujuan admin sebelum dapat digunakan.",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register POST error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
