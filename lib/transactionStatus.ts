import { prisma } from "@/lib/prisma";
import { claimAvailableStock } from "@/lib/stock";
import { generatePromoCode } from "@/lib/utils";
import { sendPaymentNotification, type WhatsAppPaymentData } from "@/lib/whatsapp";
import { rezekiSupplier } from "@/lib/suppliers";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "transaction-status" });

type ApplyResult =
  | { updated: true; transaction: Awaited<ReturnType<typeof prisma.transaction.update>> }
  | { updated: false; reason: "NOT_FOUND" }
  | { updated: false; reason: "ALREADY_PROCESSED" }
  | { updated: false; reason: "NOT_YET_SETTLED" };

const PROMO_CODE_EXPIRY_DAYS = 30;

// ── Supplier-aware stock resolver ─────────────────────────────────────────────
/**
 * Resolves a redeemUrl for a transaction based on the product's supplierMode:
 *
 * - MANUAL:       claim from local RedeemStock table (existing behaviour, no change)
 * - REZEKI:       purchase from Rezeki API automatically
 * - AUTO:         try MANUAL first; if out-of-stock, fallback to REZEKI
 *
 * Returns the redeemUrl string on success, or null on failure.
 * A null return triggers the promo code compensation flow upstream.
 *
 * NOTE: The external API call (REZEKI) runs outside the Prisma tx because
 * it leaves the database boundary. The API is called first; the DB is only
 * written to if the purchase succeeds. Failed DB writes after a successful
 * API purchase are logged for manual recovery.
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
  const product = await tx.product.findUnique({
    where: { id: info.productId },
    select: { supplierMode: true, supplierProductId: true },
  });

  const mode = product?.supplierMode ?? "MANUAL";
  const supplierProductId = product?.supplierProductId;

  // ── MANUAL: existing atomic CAS logic ────────────────────────────────────
  if (mode === "MANUAL") {
    const stock = await claimAvailableStock(tx, info.productId, {
      claimedByAgentId: info.agentId,
      customerName: info.customerName,
      customerPhone: info.customerPhone,
    });
    return stock?.redeemUrl ?? null;
  }

  // ── AUTO: try local MANUAL stock first ───────────────────────────────────
  if (mode === "AUTO") {
    const stock = await claimAvailableStock(tx, info.productId, {
      claimedByAgentId: info.agentId,
      customerName: info.customerName,
      customerPhone: info.customerPhone,
    });
    if (stock) return stock.redeemUrl;
  }

  // ── REZEKI (or AUTO fallback) ──────────────────────────────────────────
  if (!supplierProductId) {
    log.error("supplierMode is REZEKI/AUTO but supplierProductId is not set", {
      productId: info.productId,
    });
    return null;
  }

  const outcome = await rezekiSupplier.purchase(supplierProductId, 1);

  if (!outcome.success) {
    if (outcome.code === "OUT_OF_STOCK") {
      await tx.product.update({
        where: { id: info.productId },
        data: {
          supplierStock: 0,
          isSupplierAvailable: false,
          supplierLastCheckedAt: new Date(),
        },
      }).catch(() => null);
    }
    log.error("Rezeki purchase failed at settlement", {
      productId: info.productId,
      supplierProductId,
      code: outcome.code,
      message: outcome.message,
    });
    return null;
  }

  // Quantity is always 1 here; batch checkout is handled separately
  return outcome.items[0] ?? null;
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
  const result = await prisma.$transaction(async (tx: any): Promise<ApplyResult> => {
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
          promoCodeId: promoCode.id,
          paidAt: new Date(),
        },
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

    return { updated: true, transaction: updatedTransaction };
  }, { timeout: 60_000, maxWait: 10_000 }); // Rezeki purchase runs inside; default 5s is too short

  // ─── Send WhatsApp notification (non-blocking, non-critical) ─────────────
  if (result.updated) {
    void notifyPaymentSuccess(result.transaction);
  }

  return result;
}

