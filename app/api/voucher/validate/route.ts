import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/utils";
import { z } from "zod";

const validateSchema = z.object({
  code: z.string().min(1).max(50),
  productId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const code = sanitizeString(parsed.data.code).toUpperCase();

    const voucher = await prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher) {
      return NextResponse.json(
        { valid: false, error: "Kode promo tidak ditemukan" },
        { status: 200 }
      );
    }

    if (!voucher.isActive) {
      return NextResponse.json(
        { valid: false, error: "Kode promo sudah tidak aktif" },
        { status: 200 }
      );
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return NextResponse.json(
        { valid: false, error: "Kode promo sudah kadaluarsa" },
        { status: 200 }
      );
    }

    if (voucher.usedCount >= voucher.quota) {
      return NextResponse.json(
        { valid: false, error: "Kuota promo sudah habis" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      voucherId: voucher.id,
      code: voucher.code,
      discountAmount: voucher.discountAmount,
      message: `Promo berhasil diterapkan! Hemat ${new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(voucher.discountAmount)}`,
    });
  } catch (error) {
    console.error("Voucher validate error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
