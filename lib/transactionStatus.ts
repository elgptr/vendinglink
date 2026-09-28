import { prisma } from "@/lib/prisma";
import { claimAvailableStock } from "@/lib/stock";
import { generatePromoCode } from "@/lib/utils";
import { sendPaymentNotification, type WhatsAppPaymentData } from "@/lib/whatsapp";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "transaction-status" });

type ApplyResult =
  | { updated: true; transaction: Awaited<ReturnType<typeof prisma.transaction.update>> }
  | { updated: false; reason: "NOT_FOUND" }
  | { updated: false; reason: "ALREADY_PROCESSED" }
  | { updated: false; reason: "NOT_YET_SETTLED" };

const PROMO_CODE_EXPIRY_DAYS = 30;
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
    promoCodeId: string | null;
  }
): Promise<void> {
  try {
    if (!transaction.customerPhone) return;

    const [product, promoCode] = await Promise.all([
      prisma.product.findUnique({ where: { id: transaction.productId }, select: { name: true } }),
      transaction.promoCodeId
        ? prisma.promoCode.findUnique({ where: { id: transaction.promoCodeId }, select: { code: true } })
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
  // and the stock claim/update happen atomically, preventing race conditions
  // if webhook and polling fire simultaneously.
  const result = await prisma.$transaction(async (tx) => {
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
      return { updated: true, transaction: updated };
    }

    if (!isPaymentSuccess) {
      return { updated: false, reason: "NOT_YET_SETTLED" as const };
    }

    // ─── Anti race-condition: atomic stock claim ────────────────────────────
    const stock = await claimAvailableStock(tx, transaction.productId, {
      claimedByAgentId: transaction.agentId,
      customerName: transaction.customerName,
      customerPhone: transaction.customerPhone,
    });

    // ─── Out-of-stock at settlement time ──────────────────────────────
    if (!stock) {
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

        return { updated: true, transaction: cancelled };
      }

      // MIDTRANS (customer)
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

      return { updated: true, transaction: updatedTransaction };
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

    if (transaction.promoCodeId) {
      await tx.promoCode.update({
        where: { id: transaction.promoCodeId },
        data: { usedAt: new Date() },
      });
    }

    return { updated: true, transaction: updatedTransaction };
  });

  // ─── Send WhatsApp notification (non-blocking, non-critical) ────────
  if (result.updated) {
    void notifyPaymentSuccess(result.transaction);
  }

  return result;
}


