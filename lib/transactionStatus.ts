import { prisma } from "@/lib/prisma";

type ApplyResult =
  | { updated: true; transaction: Awaited<ReturnType<typeof prisma.transaction.update>> }
  | { updated: false; reason: "NOT_FOUND" }
  | { updated: false; reason: "ALREADY_PROCESSED" }
  | { updated: false; reason: "NOT_YET_SETTLED" };

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

  // ─── Idempotency: already paid, nothing to do ───────────────────────────
  if (transaction.status === "PAID") {
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
  // Use Prisma $transaction with findFirst + update for SQLite compatibility
  // For PostgreSQL, this would use SELECT FOR UPDATE SKIP LOCKED
  const result = await prisma.$transaction(async (tx) => {
    const stock = await tx.redeemStock.findFirst({
      where: {
        productId: transaction.productId,
        status: "AVAILABLE",
      },
      orderBy: { createdAt: "asc" },
    });

    if (!stock) {
      throw new Error("NO_STOCK_AVAILABLE");
    }

    await tx.redeemStock.update({
      where: { id: stock.id },
      data: {
        status: "SOLD",
        claimedByAgentId: transaction.agentId,
        customerName: transaction.customerName,
        claimedAt: new Date(),
      },
    });

    const updatedTransaction = await tx.transaction.update({
      where: { orderId },
      data: {
        status: "PAID",
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
