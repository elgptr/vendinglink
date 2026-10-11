import { type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class PayoutNotFoundError extends Error {}
export class PayoutConflictError extends Error {}

/** Mark a manually transferred draft batch paid along with its ledger entries. */
export async function markPayoutPaid(
  batchId: string,
  adminId: string,
  client: PrismaClient = prisma
) {
  return client.$transaction(async (tx) => {
    const admin = await tx.user.findFirst({
      where: { id: adminId, role: "ADMIN", isActive: true },
      select: { username: true },
    });
    if (!admin) throw new PayoutConflictError("Akun admin tidak aktif");

    const batch = await tx.payoutBatch.findUnique({
      where: { id: batchId },
      include: { credits: { select: { id: true, status: true } } },
    });
    if (!batch) throw new PayoutNotFoundError("Batch tidak ditemukan");
    if (batch.status !== "DRAFT" || batch.credits.length === 0 ||
      batch.credits.some((credit) => credit.status !== "PAYABLE")) {
      throw new PayoutConflictError("Batch tidak dapat ditandai dibayar");
    }

    const now = new Date();
    const updated = await tx.payoutBatch.updateMany({
      where: { id: batchId, status: "DRAFT" },
      data: { status: "PAID", approvedBy: admin.username, approvedAt: now },
    });
    if (updated.count !== 1) throw new PayoutConflictError("Batch sudah diproses");

    const credits = await tx.customerCredit.updateMany({
      where: { payoutBatchId: batchId, status: "PAYABLE" },
      data: { status: "PAID" },
    });
    if (credits.count !== batch.credits.length) {
      throw new PayoutConflictError("Status credit berubah; batch tidak diproses");
    }

    return { id: batch.id, status: "PAID", approvedBy: admin.username, approvedAt: now };
  });
}