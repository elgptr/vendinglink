import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeString, formatRupiah } from "@/lib/utils";
import { resolveRedeemCode } from "@/lib/promo/redeem";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rateLimit";

const log = createLogger({ module: "discount-validate" });

// Public — no auth required, since customer checkout itself is unauthenticated.
// Rate limited to slow down discount-code enumeration.
const validateLimiter = createRateLimiter(10, 60 * 1000); // 10 attempts / min / IP

// Consolidated from /api/promo-codes/validate + /api/voucher/validate (ST-2a-2).
// Resolution order: PromoCode (single-use, e.g. stockout refund) → Voucher
// (legacy admin quota discount) → new promo engine (ST-2d, B5): ReferralCode →
// VoucherRule. Legacy tables stay first so issued stockout-refund codes keep
// working; they are dropped in migration wave 3.
const validateSchema = z.object({
  code: z.string().min(1).max(50),
  productId: z.string().min(1).optional(),
  // Optional referee identity — enables the per-customer quota and
  // self-referral guards in the preview. Checkout re-checks authoritatively.
  customerPhone: z.string().max(20).optional(),
  customerName: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    if (!validateLimiter.check(ip).allowed) {
      log.warn("Discount validate rate limited", { ip });
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
        { status: 429 }
      );
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

    // 1) PromoCode — single-use (usedAt), e.g. stockout refund compensation.
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

    // 2) Voucher — multi-use with quota, optionally product-scoped.
    const voucher = await prisma.voucher.findUnique({
      where: { code },
      include: { applicableProducts: { select: { id: true } } },
    });

    if (voucher) {
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

      if (
        parsed.data.productId &&
        voucher.applicableProducts &&
        voucher.applicableProducts.length > 0
      ) {
        const isApplicable = voucher.applicableProducts.some(
          (p) => p.id === parsed.data.productId
        );
        if (!isApplicable) {
          return NextResponse.json(
            { valid: false, error: "Kode promo ini tidak berlaku untuk produk ini" },
            { status: 200 }
          );
        }
      }

      return NextResponse.json({
        valid: true,
        voucherId: voucher.id,
        code: voucher.code,
        discountAmount: voucher.discountAmount,
        message: `Promo berhasil diterapkan! Hemat ${formatRupiah(
          voucher.discountAmount
        )}`,
      });
    }

    // 3) New promo/referral engine (ST-2d, B5): ReferralCode → VoucherRule.
    // Preview only — needs the product context for minSpend/PERCENT, so it
    // runs when a known productId is supplied; checkout is authoritative.
    if (parsed.data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: parsed.data.productId },
        select: { price: true, categoryId: true },
      });

      if (product) {
        const resolution = await resolveRedeemCode({
          prisma,
          code,
          amount: product.price,
          productCategoryId: product.categoryId,
          customerPhone: parsed.data.customerPhone,
          customerName: parsed.data.customerName,
        });

        if (resolution.ok) {
          return NextResponse.json({
            valid: true,
            // The client submits this back as `discountCode` at checkout —
            // the server re-resolves it there and never trusts a
            // client-supplied discount amount.
            redeemCode: resolution.code,
            kind: resolution.kind,
            code: resolution.code,
            discountAmount: resolution.discountAmount,
            message:
              resolution.kind === "REFERRAL"
                ? `Kode referral berhasil diterapkan! Potongan ${formatRupiah(
                    resolution.discountAmount
                  )}`
                : `Promo berhasil diterapkan! Hemat ${formatRupiah(
                    resolution.discountAmount
                  )}`,
          });
        }

        return NextResponse.json(
          { valid: false, error: resolution.error },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      { valid: false, error: "Kode promo atau voucher tidak valid" },
      { status: 200 }
    );
  } catch (error) {
    log.error("Discount validate error", { error: String(error) });
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
