import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeString, formatRupiah } from "@/lib/utils";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "promo-codes-validate" });

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

    if (promoCode) {
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
    }

    // Fallback to check Voucher table
    const voucher = await prisma.voucher.findUnique({
      where: { code },
    });

    if (voucher) {
      if (!voucher.isActive) {
        return NextResponse.json(
          { valid: false, error: "Kode voucher sudah tidak aktif" },
          { status: 200 }
        );
      }

      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        return NextResponse.json(
          { valid: false, error: "Kode voucher sudah kadaluarsa" },
          { status: 200 }
        );
      }

      if (voucher.usedCount >= voucher.quota) {
        return NextResponse.json(
          { valid: false, error: "Kuota voucher sudah habis" },
          { status: 200 }
        );
      }

      return NextResponse.json({
        valid: true,
        voucherId: voucher.id,
        code: voucher.code,
        discountAmount: voucher.discountAmount,
        message: `Voucher berhasil diterapkan! Hemat ${formatRupiah(
          voucher.discountAmount
        )}`,
      });
    }

    return NextResponse.json(
      { valid: false, error: "Kode promo atau voucher tidak valid" },
      { status: 200 }
    );
  } catch (error) {
    log.error("Promo code validate error", { error: String(error) });
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

