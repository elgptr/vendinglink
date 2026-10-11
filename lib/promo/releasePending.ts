import type { Prisma } from "@prisma/client";

/** Release only reservations for an order already transitioned out of PENDING.
 * Must run in the same DB transaction as the status transition, once.
 */
export async function releasePendingRedemptions(tx: Prisma.TransactionClient, transactionId: string) {
  const vouchers = await tx.voucherRedemption.findMany({
    where: { transactionId }, select: { id: true, ruleId: true },
  });
  for (const row of vouchers) {
    await tx.voucherRedemption.delete({ where: { id: row.id } });
    await tx.voucherRule.update({ where: { id: row.ruleId }, data: { usedCount: { decrement: 1 } } });
  }
  const referrals = await tx.referralRedemption.findMany({
    where: { transactionId }, select: { id: true },
  });
  for (const row of referrals) await tx.referralRedemption.delete({ where: { id: row.id } });
}