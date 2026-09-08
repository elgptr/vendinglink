import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeString, formatRupiah } from "@/lib/utils";
import { z } from "zod";

// Public — no auth required, since customer checkout itself is unauthenticated.
const validateSchema = z.object({
  code: z.string().min(1).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const code = sanitizeString(parsed.data.code).toUpperCase();

    const promoCode = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (!promoCode) {
      return NextResponse.json(
        { valid: false, error: "Kode promo tidak ditemukan" },
        { status: 200 }
      );
    }

    if (!promoCode.isActive || promoCode.usedAt) {
      return NextResponse.json(
        { valid: false, error: "Kode promo sudah digunakan" },
        { status: 200 }
      );
    }

    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      return NextResponse.json(
        { valid: false, error: "Kode promo sudah kadaluarsa" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      promoCodeId: promoCode.id,
      code: promoCode.code,
      discountAmount: promoCode.discount,
      message: `Kode promo berhasil diterapkan! Potongan ${formatRupiah(
        promoCode.discount
      )}`,
    });
  } catch (error) {
    console.error("Promo code validate error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
