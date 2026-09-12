import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSnapTransaction } from "@/lib/midtrans";
import { generateOrderId, sanitizeString } from "@/lib/utils";
import { claimAvailableStock } from "@/lib/stock";
import { createRateLimiter } from "@/lib/rateLimit";
import { verifyCsrfRequest, extractCsrfTokens } from "@/lib/csrf";
import { validatePayloadSize } from "@/lib/inputValidation";
import { z } from "zod";

// Rate limiter for public customer checkout (20 attempts / min / IP).
const checkoutLimiter = createRateLimiter(20, 60 * 1000);

const customerCheckoutSchema = z.object({
  productId: z.string().min(1),
  voucherId: z.string().optional(),
  promoCodeId: z.string().optional(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // ── Security guards (rate limit, CSRF, payload size) ────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    if (!checkoutLimiter.check(ip).allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const { cookieToken, submittedToken } = extractCsrfTokens(
      request.headers.get("cookie"),
      request.headers.get("x-csrf-token")
    );
    if (!verifyCsrfRequest(cookieToken, submittedToken)) {
      return NextResponse.json({ error: "CSRF token tidak valid" }, { status: 403 });
    }

    const contentLength = request.headers.get("content-length");
    const sizeCheck = validatePayloadSize(contentLength ? Number(contentLength) : null);
    if (!sizeCheck.allowed) {
      return NextResponse.json({ error: sizeCheck.reason }, { status: 413 });
    }

    const body = await request.json();
    const parsed = customerCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, voucherId, promoCodeId, customerName, customerPhone } = parsed.data;
    const sanitizedCustomerName = sanitizeString(customerName);
    const sanitizedCustomerPhone = customerPhone ? sanitizeString(customerPhone) : undefined;

    if (!sanitizedCustomerName) {
      return NextResponse.json(
        { error: "Nama pembeli wajib diisi" },
        { status: 400 }
      );
    }

    // ─── Verify product exists and is active ──────────────────────────────
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    // ─── Check stock availability ──────────────────────────────────────────
    const availableStock = await prisma.redeemStock.count({
      where: { productId, status: "AVAILABLE" },
    });

    if (availableStock === 0) {
      return NextResponse.json(
        { error: "Stok produk habis" },
        { status: 400 }
      );
    }

    // ─── Calculate price with voucher or stockout-refund promo code ────────
    // Mutually exclusive: a promo code (auto-issued full refund) takes
    // priority over a manually-entered voucher, since it's a compensation
    // credit rather than a marketing discount.
    let discountAmount = 0;
    let resolvedVoucherId: string | undefined;
    let resolvedPromoCodeId: string | undefined;

    if (promoCodeId) {
      const promoCode = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
      });

      if (
        promoCode &&
        promoCode.isActive &&
        !promoCode.usedAt &&
        (!promoCode.expiresAt || new Date(promoCode.expiresAt) > new Date())
      ) {
        discountAmount = promoCode.discount;
        resolvedPromoCodeId = promoCode.id;
      }
    } else if (voucherId) {
      const voucher = await prisma.voucher.findFirst({
        where: { id: voucherId, isActive: true },
      });

      if (voucher && voucher.usedCount < voucher.quota) {
        if (!voucher.expiresAt || new Date(voucher.expiresAt) > new Date()) {
          discountAmount = voucher.discountAmount;
          resolvedVoucherId = voucher.id;
        }
      }
    }

    const originalPrice = product.price;
    const finalAmount = Math.max(0, originalPrice - discountAmount);

    // ─── Generate order ID ─────────────────────────────────────────────────
    const orderId = generateOrderId();

    // ─── Full-refund promo code: skip Midtrans entirely ────────────────────
    // Midtrans's Snap API rejects gross_amount = 0, and there's nothing left
    // to charge anyway — fulfil the order immediately and atomically, the
    // same way agent credit checkout does, instead of routing through a
    // payment gateway for a Rp 0 order.
    if (finalAmount === 0 && (resolvedPromoCodeId || resolvedVoucherId)) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const claimedStock = await claimAvailableStock(tx, productId, {
            customerName: sanitizedCustomerName,
            customerPhone: sanitizedCustomerPhone,
          });

          if (!claimedStock) {
            throw new Error("NO_STOCK");
          }

          if (resolvedPromoCodeId) {
            const promoUpdate = await tx.promoCode.updateMany({
              where: { id: resolvedPromoCodeId, usedAt: null },
              data: { usedAt: new Date() },
            });

            if (promoUpdate.count === 0) {
              throw new Error("PROMO_ALREADY_USED");
            }
          }

          if (resolvedVoucherId) {
            await tx.voucher.update({
              where: { id: resolvedVoucherId },
              data: { usedCount: { increment: 1 } },
            });
          }

          const transaction = await tx.transaction.create({
            data: {
              orderId,
              productId,
              agentId: null,
              promoCodeId: resolvedPromoCodeId,
              voucherId: resolvedVoucherId,
              customerName: sanitizedCustomerName,
              customerPhone: sanitizedCustomerPhone,
              paymentType: "MIDTRANS",
              originalPrice,
              discountAmount,
              finalAmount: 0,
              status: "PAID",
              stockStatus: "FULFILLED",
              redeemUrl: claimedStock.redeemUrl,
              paidAt: new Date(),
            },
          });

          return { transaction, claimedStock };
        });

        return NextResponse.json({
          orderId: result.transaction.orderId,
          amount: 0,
          originalPrice,
          discountAmount,
          productName: product.name,
          customerName: sanitizedCustomerName,
          redeemUrl: result.claimedStock.redeemUrl,
          guideImageUrl: product.guideImageUrl,
        });
      } catch (txError) {
        if (txError instanceof Error && txError.message === "NO_STOCK") {
          return NextResponse.json({ error: "Stok produk habis" }, { status: 400 });
        }
        if (txError instanceof Error && txError.message === "PROMO_ALREADY_USED") {
          return NextResponse.json(
            { error: "Kode promo sudah digunakan" },
            { status: 400 }
          );
        }
        throw txError;
      }
    }

    // ─── Create Midtrans Snap transaction ──────────────────────────────────
    let snapToken: string | undefined;

    try {
      const snapResponse = await createSnapTransaction({
        orderId,
        amount: finalAmount,
        customerName: sanitizedCustomerName,
        customerPhone: sanitizedCustomerPhone,
        productName: product.name,
      });

      snapToken = snapResponse.token;
    } catch (midtransError) {
      console.error("Midtrans charge error:", midtransError);

      const httpStatus = (midtransError as { httpStatusCode?: string }).httpStatusCode;
      if (httpStatus === "402") {
        return NextResponse.json(
          { error: "Metode pembayaran belum diaktifkan di akun Midtrans." },
          { status: 502 }
        );
      }
      if (httpStatus === "401") {
        return NextResponse.json(
          { error: "Konfigurasi Midtrans tidak valid. Periksa SERVER_KEY di .env." },
          { status: 502 }
        );
      }

      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
          { error: "Gagal membuat transaksi pembayaran." },
          { status: 500 }
        );
      }
    }

    // ─── Save transaction to DB ────────────────────────────────────────────
    const transaction = await prisma.transaction.create({
      data: {
        orderId,
        productId,
        agentId: null, // Public B2C transaction has no agent
        voucherId: resolvedVoucherId,
        promoCodeId: resolvedPromoCodeId,
        customerName: sanitizedCustomerName,
        customerPhone: sanitizedCustomerPhone,
        paymentType: "MIDTRANS",
        originalPrice,
        discountAmount,
        finalAmount,
        status: "PENDING",
        snapToken,
      },
    });

    return NextResponse.json({
      orderId: transaction.orderId,
      amount: finalAmount,
      originalPrice,
      discountAmount,
      productName: product.name,
      customerName: sanitizedCustomerName,
      snapToken: transaction.snapToken,
    });

  } catch (error) {
    console.error("Customer checkout error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
