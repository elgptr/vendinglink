import { prisma } from "@/lib/prisma";
import { claimAvailableStock } from "@/lib/stock";
import { generatePromoCode } from "@/lib/utils";
import { sendPaymentNotification, type WhatsAppPaymentData } from "@/lib/whatsapp";
import { accrueReferralCommission } from "@/lib/promo/accrual";
import { releasePendingRedemptions } from "@/lib/promo/releasePending";
import { createLogger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

const log = createLogger({ module: "transaction-status" });

type ApplyResult =
  | { updated: true; transaction: Awaited<ReturnType<typeof prisma.transaction.update>> }
  | { updated: false; reason: "NOT_FOUND" }
  | { updated: false; reason: "ALREADY_PROCESSED" }
  | { updated: false; reason: "NOT_YET_SETTLED" };

const PROMO_CODE_EXPIRY_DAYS = 30;

// ── Stock resolver ────────────────────────────────────────────────────────────
/**
 * Resolves a redeemUrl for a transaction from local RedeemStock.
 * Returns the redeemUrl string on success, or null on failure.
 * A null return triggers the promo code compensation flow upstream.
 */
async function resolveStock(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  info: {
    productId: string;
    agentId: string | null;
    customerName: string | null;
    customerPhone: string | null;
  }
): Promise<string | null> {
  const stock = await claimAvailableStock(tx, info.productId, {
    claimedByAgentId: info.agentId,
    customerName: info.customerName,
    customerPhone: info.customerPhone,
  });
  return stock?.redeemUrl ?? null;
}

// ── WhatsApp notification helper ──────────────────────────────────────────────
/**
 * Safely send WhatsApp payment notification after transaction is settled.
 * Non-blocking: failures are logged but never thrown.
 */
export async function notifyPaymentSuccess(
  transaction: {
    orderId: string;
    customerPhone: string | null;
    productId: string;
    finalAmount: number;
    redeemUrl: string | null;
    stockStatus: string;
    // The ISSUED refund code (stockout compensation) — not the applied-code
    // column, which holds discount semantics (TD-8).
    refundPromoCodeId: string | null;
  }
): Promise<void> {
  try {
    if (!transaction.customerPhone) return;

    const [product, promoCode] = await Promise.all([
      prisma.product.findUnique({ where: { id: transaction.productId }, select: { name: true } }),
      transaction.refundPromoCodeId
        ? prisma.promoCode.findUnique({ where: { id: transaction.refundPromoCodeId }, select: { code: true } })
        : null,
    ]);

    const data: WhatsAppPaymentData = {
      customerPhone: transaction.customerPhone,
      orderId: transaction.orderId,
      productName: product?.name ?? "Produk",
      finalAmount: transaction.finalAmount,
      redeemUrl: transaction.redeemUrl ?? undefined,
      promoCode: promoCode?.code ?? undefined,
    };

    await sendPaymentNotification(data);
  } catch (error) {
    // Non-critical: log and continue — payment already succeeded
    log.error("WhatsApp notification failed (non-critical)", {
      orderId: transaction.orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ── Main status update function ───────────────────────────────────────────────
/**
 * Apply a Midtrans transaction_status/fraud_status update to our local
 * Transaction record. Shared by:
 * - the HTTP notification handler (app/api/midtrans/webhook/route.ts)
 * - the polling status endpoint (app/api/order/status/route.ts), which uses
 *   this as a fallback reconciliation when the webhook notification never
 *   arrives (e.g. Midtrans cannot reach a localhost dev server).
 *
 * Idempotent: safe to call repeatedly with the same or stale status.
 */
export async function applyMidtransStatusUpdate(
  orderId: string,
  transactionStatus: string,
  fraudStatus?: string
): Promise<ApplyResult> {
  // We use a single interactive transaction to ensure the idempotency check
  // and the stock resolution happen atomically, preventing race conditions
  // if webhook and polling fire simultaneously.
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<ApplyResult> => {
    const transaction = await tx.transaction.findUnique({
      where: { orderId },
    });

    if (!transaction) {
      return { updated: false, reason: "NOT_FOUND" as const };
    }

    // ─── Idempotency: already settled (paid or cancelled), nothing to do ───
    if (
      transaction.status === "PAID" ||
      transaction.status === "CANCELLED" ||
      transaction.status === "EXPIRED"
    ) {
      return { updated: false, reason: "ALREADY_PROCESSED" as const };
    }

    const isPaymentSuccess =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    const isExpired =
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire";

    if (isExpired) {
      const updated = await tx.transaction.update({
        where: { orderId },
        data: { status: "EXPIRED" },
      });
      await releasePendingRedemptions(tx, transaction.id);
      return { updated: true, transaction: updated };
    }

    if (!isPaymentSuccess) {
      return { updated: false, reason: "NOT_YET_SETTLED" as const };
    }

    // ─── Supplier-aware stock resolution ─────────────────────────────────────
    const redeemUrl = await resolveStock(tx, {
      productId: transaction.productId,
      agentId: transaction.agentId,
      customerName: transaction.customerName,
      customerPhone: transaction.customerPhone,
    });

    // ─── Stock not available / supplier failed ────────────────────────────────
    if (!redeemUrl) {
      if (transaction.paymentType === "AGENT_CREDIT") {
        const cancelled = await tx.transaction.update({
          where: { orderId },
          data: {
            status: "CANCELLED",
            stockStatus: "OUT_OF_STOCK",
          },
        });

        if (transaction.agentId) {
          await tx.user.update({
            where: { id: transaction.agentId },
            data: { outstandingDebt: { decrement: transaction.finalAmount } },
          });
        }

        await releasePendingRedemptions(tx, transaction.id);
        return { updated: true, transaction: cancelled };
      }

      // MIDTRANS (customer): issue promo code as full-refund compensation
      const promoCode = await tx.promoCode.create({
        data: {
          code: generatePromoCode(),
          discount: transaction.finalAmount,
          type: "STOCKOUT_REFUND",
          expiresAt: new Date(
            Date.now() + PROMO_CODE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
          ),
        },
      });

      const updatedTransaction = await tx.transaction.update({
        where: { orderId },
        data: {
          status: "PAID",
          stockStatus: "OUT_OF_STOCK",
          // TD-8: write to the dedicated issued-refund column, never to
          // promoCodeId (which references the code applied at checkout).
          refundPromoCodeId: promoCode.id,
          paidAt: new Date(),
        },
      });

      // A captured payment without delivered stock is not a completed sale.
      // Never create a payable referral commission for a stockout.
      await tx.customerCredit.updateMany({
        where: { kind: "REFERRAL_COMMISSION", sourceTxnId: updatedTransaction.id,
          status: { in: ["ACCRUED", "PAYABLE"] }, payoutBatchId: null },
        data: { status: "VOID" },
      });

      return { updated: true, transaction: updatedTransaction };
    }

    // ─── Happy path: key resolved, fulfil order ───────────────────────────────
    const updatedTransaction = await tx.transaction.update({
      where: { orderId },
      data: {
        status: "PAID",
        stockStatus: "FULFILLED",
        redeemUrl,
        paidAt: new Date(),
      },
    });

    if (transaction.voucherId) {
      await tx.voucher.update({
        where: { id: transaction.voucherId },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (transaction.promoCodeId) {
      await tx.promoCode.update({
        where: { id: transaction.promoCodeId },
        data: { usedAt: new Date() },
      });
    }

    // ST-2d: accrue the referrer's commission if a referral code was
    // redeemed on this order (no-op when none was).
    await accrueReferralCommission(tx, updatedTransaction.id);

    return { updated: true, transaction: updatedTransaction };
  }, { timeout: 60_000, maxWait: 10_000 }); // Rezeki purchase runs inside; default 5s is too short

  // ─── Send WhatsApp notification (non-blocking, non-critical) ─────────────
  if (result.updated) {
    void notifyPaymentSuccess(result.transaction);
  }

  return result;
}

