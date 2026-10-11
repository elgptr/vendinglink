import type { PrismaClient, ProgramConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * ProgramConfig — singleton, admin-editable promo/referral program settings
 * (P1 ST-2a-2). Same runtime pattern as SupplierConfig: one row, created with
 * defaults on first read if missing.
 *
 * Guardrails (ROADMAP.md §5 Item 2):
 * - `accrualWindowDays` default 15, hard ceiling 15 — admin validation must
 *   reject values > 15.
 * - `referralCommissionPct` is snapshotted into CustomerCredit.appliedRatePct
 *   at accrual time; editing it here never rewrites existing credits.
 * - `minPayoutAmount` default Rp 20.000 (B3): PAYABLE credits below the
 *   threshold roll over to the next payout batch.
 */
export async function getProgramConfig(
  client: PrismaClient = prisma
): Promise<ProgramConfig> {
  const existing = await client.programConfig.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  // First boot / post-migration: create the singleton with schema defaults.
  return client.programConfig.create({ data: {} });
}
