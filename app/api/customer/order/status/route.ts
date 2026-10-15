import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMidtransStatus } from "@/lib/midtrans";
import { getKaseraPaymentStatus } from "@/lib/kasera";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";
import { normalizePhone } from "@/lib/phone";
import { getProgramConfig } from "@/lib/programConfig";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "customer-order-status" });

// Public order status polling — no auth required. Only reachable with the
// unguessable orderId (VM-<timestamp>-<random>), and restricted to
// public customer payment gateways (agentId null) so an agent's
// credit-based order can never be looked up through this endpoint.
export const dynamic = "force-dynamic";

const transactionSelect = {
  orderId: true,
  productId: true,
  status: true,
  paymentType: true,
  finalAmount: true,
  originalPrice: true,
  discountAmount: true,
  customerName: true,
  customerPhone: true,
  createdAt: true,
  paidAt: true,
  qrCodeUrl: true,
  // Only exposed in the response if PAID (see safeRedeemUrl below)
  redeemUrl: true,
  product: {
    select: { name: true, guideImageUrl: true, type: true, guideText: true },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId diperlukan" }, { status: 400 });
    }

    let transaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: transactionSelect,
    });

    if (
      !transaction ||
      (transaction.paymentType !== "MIDTRANS" &&
        transaction.paymentType !== "DOKU" &&
        transaction.paymentType !== "KASERA" &&
        transaction.paymentType !== "FREE_PROMO")
    ) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // ─── Fallback reconciliation ─────────────────────────────────────────
    // Mirrors /api/order/status: actively check gateway Status API
    // while PENDING, in case the webhook notification never arrives.
    if (transaction.status === "PENDING" && transaction.paymentType === "MIDTRANS") {
      try {
        const midtransStatus = await getMidtransStatus(orderId);
        const result = await applyMidtransStatusUpdate(
          orderId,
          midtransStatus.transaction_status,
          midtransStatus.fraud_status
        );

        if (result.updated || (!result.updated && result.reason === "ALREADY_PROCESSED")) {
          transaction = await prisma.transaction.findUnique({
            where: { orderId },
            select: transactionSelect,
          });
        }
      } catch (statusError) {
        log.warn(
          "Midtrans status check failed",
          {
            orderId,
            error: statusError instanceof Error ? statusError.message : String(statusError),
          }
        );
      }
    } else if (
      transaction.status === "PENDING" &&
      transaction.paymentType === "KASERA" &&
      transaction.qrCodeUrl
    ) {
      try {
        const kaseraStatus = await getKaseraPaymentStatus(transaction.qrCodeUrl);
        let internalStatus: string | null = null;
        if (kaseraStatus.status === "succeeded") {
          internalStatus = "settlement";
        } else if (kaseraStatus.status === "expired" || kaseraStatus.status === "failed") {
          internalStatus = "expire";
        }

        if (internalStatus) {
          const result = await applyMidtransStatusUpdate(orderId, internalStatus);
          if (result.updated || (!result.updated && result.reason === "ALREADY_PROCESSED")) {
            transaction = await prisma.transaction.findUnique({
              where: { orderId },
              select: transactionSelect,
            });
          }
        }
      } catch (statusError) {
        log.warn(
          "Kasera status check failed",
          {
            orderId,
            error: statusError instanceof Error ? statusError.message : String(statusError),
          }
        );
      }
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Only return redeemUrl/guideImageUrl if transaction is PAID
    const isPaid = transaction.status === "PAID";

    // ─── Referral info (ST-2c-2) ─────────────────────────────────────────
    // Exposed only once PAID (same gating as redeemUrl). Resolved via the
    // normalized customer phone → Customer → ReferralCode. The commission
    // percentage comes from the live ProgramConfig singleton — never a
    // hardcoded number.
    let referralCode: string | null = null;
    let referralCommissionPct: number | null = null;
    if (isPaid && transaction.customerPhone) {
      const normalizedPhone = normalizePhone(transaction.customerPhone);
      if (normalizedPhone) {
        const customer = await prisma.customer.findUnique({
          where: { phone: normalizedPhone },
          include: { referralCode: { select: { code: true } } },
        });
        referralCode = customer?.consentPromoAt ? customer.referralCode?.code ?? null : null;
        if (referralCode) {
          const programConfig = await getProgramConfig();
          referralCommissionPct = programConfig.referralCommissionPct;
        }
      }
    }

    return NextResponse.json({
      orderId: transaction.orderId,
      productId: transaction.productId,
      status: transaction.status,
      paymentType: transaction.paymentType,
      finalAmount: transaction.finalAmount,
      originalPrice: transaction.originalPrice,
      discountAmount: transaction.discountAmount,
      customerName: transaction.customerName,
      productName: transaction.product.name,
      productType: transaction.product.type,
      createdAt: transaction.createdAt,
      paidAt: transaction.paidAt,
      redeemUrl: isPaid ? transaction.redeemUrl : null,
      guideImageUrl: isPaid ? transaction.product.guideImageUrl : null,
      guideText: isPaid ? transaction.product.guideText : null,
      referralCode,
      referralCommissionPct,
    });
  } catch (error) {
    log.error("Customer order status retrieval failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
