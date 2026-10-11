import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "promo-accrual" });

// Mirror of the ProgramConfig schema defaults, used when the singleton row
// has not been created yet (first boot / tests).
const DEFAULT_REFERRAL_COMMISSION_PCT = 5;
const DEFAULT_ACCRUAL_WINDOW_DAYS = 15;

/**
 * Accrue the referrer's commission when a referee order transitions to PAID.
 *
 * Creates a CustomerCredit kind REFERRAL_COMMISSION / status ACCRUED for the
 * owner of the ReferralCode redeemed on this transaction. Guardrails
 * (ROADMAP §5 Item 2):
 * - Referral is 1 level only (B4): the credit goes to the direct owner of the
 *   redeemed code, never further up.
 * - `appliedRatePct` is a SNAPSHOT of ProgramConfig at accrual time — later
 *   admin edits never rewrite debt that already accrued.
 * - `payableAt` is computed now (paidAt + accrualWindowDays), making the
 *   later ACCRUED → PAYABLE transition (ST-2e, cron) idempotent regardless of
 *   cron precision.
 * - Idempotent via @@unique([kind, sourceTxnId]): a second call for the same
 *   order is a silent no-op.
 *
 * Must be called inside the same $transaction that marks the order PAID.
 */
export async function accrueReferralCommission(
  tx: Prisma.TransactionClient,
  transactionId: string
): Promise<void> {
  const redemption = await tx.referralRedemption.findFirst({
    where: { transactionId },
    include: { referralCode: { select: { id: true, customerId: true } } },
  });
  if (!redemption) return;

  const txn = await tx.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, finalAmount: true, paidAt: true, status: true, stockStatus: true },
  });
  if (!txn?.paidAt || txn.status !== "PAID" || txn.stockStatus !== "FULFILLED") return;

  const config = await tx.programConfig.findFirst({
    orderBy: { createdAt: "asc" },
  });
  const pct = config?.referralCommissionPct ?? DEFAULT_REFERRAL_COMMISSION_PCT;
  const windowDays = config?.accrualWindowDays ?? DEFAULT_ACCRUAL_WINDOW_DAYS;

  // Commission basis: Transaction.finalAmount (what the referee actually
  // paid), not originalPrice.
  let amount = Math.floor((txn.finalAmount * pct) / 100);
  if (config?.referralCommissionCap != null) {
    amount = Math.min(amount, config.referralCommissionCap);
  }
  if (amount <= 0) {
    log.info("Referral commission is Rp 0 — no credit accrued", {
      transactionId,
      finalAmount: txn.finalAmount,
      pct,
    });
    return;
  }

  try {
    await tx.customerCredit.create({
      data: {
        customerId: redemption.referralCode.customerId,
        kind: "REFERRAL_COMMISSION",
        amount,
        appliedRatePct: pct,
        status: "ACCRUED",
        sourceTxnId: txn.id,
        referralCodeId: redemption.referralCodeId,
        payableAt: new Date(txn.paidAt.getTime() + windowDays * 86_400_000),
      },
    });
    log.info("Referral commission accrued", {
      transactionId,
      referrerCustomerId: redemption.referralCode.customerId,
      amount,
      pct,
    });
  } catch (error) {
    // @@unique([kind, sourceTxnId]) — already accrued for this order.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

/**
 * ST-2e: Promote matured CustomerCredits ACCRUED → PAYABLE.
 *
 * Guardrails (ROADMAP §5 Item 2):
 * - Status naik ke PAYABLE **hanya** lewat cron terjadwal ini, setelah
 *   `accrualWindowDays` (Q3: default 15, hard ceiling 15). `payableAt` sudah
 *   di-precompute saat akrual (`paidAt + window`), jadi transisi ini idempoten
 *   terhadap presisi cron ±59 menit maupun pemanggilan berulang — rerun tidak
 *   menemukan baris ACCRUED yang sama lagi.
 * - Credit legacy `STOCKOUT_REFUND` (refund via claim code) punya `payableAt`
 *   NULL sehingga tidak pernah termatch — lifecycle-nya berbasis klaim, bukan
 *   waktu.
 *
 * Menumpang slot `/api/cron/reconcile` (slot cron sudah penuh): dipanggil
 * setelah blok rekonsiliasi dan HARUS tetap jalan walau tidak ada transaksi
 * stuck.
 *
 * @returns jumlah credit yang dipromosikan.
 */
export async function promoteAccruedCreditsToPayable(
  client: PrismaClient | Prisma.TransactionClient = prisma,
  now: Date = new Date()
): Promise<number> {
  // Legacy credits created before the stockout guard must never reach payout.
  // Leave already batched/paid rows untouched for manual financial review.
  const stockouts = await client.transaction.findMany({
    where: { stockStatus: "OUT_OF_STOCK" }, select: { id: true },
  });
  if (stockouts.length) {
    const voided = await client.customerCredit.updateMany({
      where: { kind: "REFERRAL_COMMISSION", sourceTxnId: { in: stockouts.map((order) => order.id) },
        status: { in: ["ACCRUED", "PAYABLE"] }, payoutBatchId: null },
      data: { status: "VOID" },
    });
    if (voided.count) log.warn("Stockout referral credits voided", { count: voided.count });
  }
  const result = await client.customerCredit.updateMany({
    where: { status: "ACCRUED", payableAt: { lte: now } },
    data: { status: "PAYABLE" },
  });
  if (result.count > 0) {
    log.info("CustomerCredits promoted ACCRUED → PAYABLE", {
      count: result.count,
    });
  }
  return result.count;
}
