import { prisma } from "@/lib/prisma";
import { claimAvailableStock } from "@/lib/stock";
import { generatePromoCode } from "@/lib/utils";

type ApplyResult =
  | { updated: true; transaction: Awaited<ReturnType<typeof prisma.transaction.update>> }
  | { updated: false; reason: "NOT_FOUND" }
  | { updated: false; reason: "ALREADY_PROCESSED" }
  | { updated: false; reason: "NOT_YET_SETTLED" };

const PROMO_CODE_EXPIRY_DAYS = 30;

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
  const transaction = await prisma.transaction.findUnique({
    where: { orderId },
  });

  if (!transaction) {
    return { updated: false, reason: "NOT_FOUND" };
  }

  // ─── Idempotency: already settled (paid or cancelled), nothing to do ───
  if (transaction.status === "PAID" || transaction.status === "CANCELLED") {
    return { updated: false, reason: "ALREADY_PROCESSED" };
  }

  const isPaymentSuccess =
    transactionStatus === "settlement" ||
    (transactionStatus === "capture" && fraudStatus === "accept");

  const isExpired =
    transactionStatus === "cancel" ||
    transactionStatus === "deny" ||
    transactionStatus === "expire";

  if (isExpired) {
    const updated = await prisma.transaction.update({
      where: { orderId },
      data: { status: "EXPIRED" },
    });
    return { updated: true, transaction: updated };
  }

  if (!isPaymentSuccess) {
    return { updated: false, reason: "NOT_YET_SETTLED" };
  }

  // ─── Anti race-condition: atomic stock claim ────────────────────────────
  const result = await prisma.$transaction(async (tx) => {
    const stock = await claimAvailableStock(tx, transaction.productId, {
      claimedByAgentId: transaction.agentId,
      customerName: transaction.customerName,
      customerPhone: transaction.customerPhone,
    });

    // ─── Out-of-stock at settlement time ──────────────────────────────
    // Money has already been captured by Midtrans (this is the payment
    // success branch), but a concurrent buyer claimed the last unit
    // between checkout and settlement. Customers can't be "un-charged"
    // here automatically, so compensate with a full-value promo code
    // they can redeem on their next order once stock is replenished.
    //
    // Note: this function is only ever reached via the Midtrans webhook
    // or its polling fallback, both of which only fire for orders that
    // were actually sent to Midtrans — i.e. paymentType is always
    // "MIDTRANS" in practice today. The AGENT_CREDIT branch below is kept
    // as a defensive safety net (agent checkout's own race-condition
    // handling already lives in app/api/checkout/agent/route.ts, where a
    // failed stock claim rolls back the whole DB transaction before any
    // debt is ever recorded).
    if (!stock) {
      if (transaction.paymentType === "AGENT_CREDIT") {
        // Agents pay on credit (no real money moved yet) — simplest and
        // safest resolution is to cancel the order outright and never
        // record the debt in the first place.
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

        return cancelled;
      }

      // MIDTRANS (customer) — real money was captured, so issue a
      // full-refund-value promo code instead of silently failing.
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
          promoCodeId: promoCode.id,
          paidAt: new Date(),
        },
      });

      return updatedTransaction;
    }

    // ─── Happy path: stock available, fulfil normally ──────────────────
    const updatedTransaction = await tx.transaction.update({
      where: { orderId },
      data: {
        status: "PAID",
        stockStatus: "FULFILLED",
        redeemUrl: stock.redeemUrl,
        paidAt: new Date(),
      },
    });

    if (transaction.voucherId) {
      await tx.voucher.update({
        where: { id: transaction.voucherId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return updatedTransaction;
  });

  return { updated: true, transaction: result };
}


