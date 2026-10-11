import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "promo-payout" });

// Mirror of the ProgramConfig schema default (B3), used when the singleton row
// has not been created yet.
const DEFAULT_MIN_PAYOUT_AMOUNT = 20000;

// Bank transfer needs an account number, which Customer does not store yet.
export const PAYOUT_CHANNELS = ["GOPAY", "OVO"] as const;
export type PayoutChannel = (typeof PAYOUT_CHANNELS)[number];

export class PayoutBatchExistsError extends Error {
  constructor(period: string, channel: string) {
    super(`Payout batch periode ${period} channel ${channel} sudah ada`);
    this.name = "PayoutBatchExistsError";
  }
}

export class PayoutBatchRaceError extends Error {
  constructor() {
    super("Credit sudah diambil batch lain — coba lagi");
    this.name = "PayoutBatchRaceError";
  }
}

export interface PayoutLine {
  customerId: string;
  phone: string;
  name: string | null;
  amount: number;
  creditCount: number;
}

export interface GeneratePayoutResult {
  batch: {
    id: string;
    period: string;
    channel: string;
    totalAmount: number;
    status: string;
  } | null;
  lines: PayoutLine[];
  /** Customers whose PAYABLE total is below minPayoutAmount — rolled over (B3). */
  skippedBelowThreshold: number;
}


/**
 * ST-2f: Generate a PayoutBatch for a period.
 *
 * Guardrails (ROADMAP §5 Item 2):
 * - Sweeps ALL outstanding PAYABLE REFERRAL_COMMISSION credits (payoutBatchId
 *   NULL). Credits below `minPayoutAmount` (B3, default Rp 20.000) stay PAYABLE
 *   and roll over into the next batch until they accumulate past the threshold
 *   — that's why the sweep is not restricted to credits "from" this period.
 * - Payout is cash only (D4); the transfer destination is the referrer's own
 * -   phone number (B2) for GoPay/OVO. Bank transfer is not offered without
 *   collecting and verifying an account number.
 * - Manual flow: the system generates the batch + CSV, the admin transfers
 *   outside the system, then marks it PAID (ST-2g). Batches are created DRAFT.
 * - Atomic: batch creation + credit linking happen in one transaction. If a
 *   concurrent run claims any of the credits first, the whole batch rolls back.
 * - Duplicate period/channel batches are rejected by a database unique index.
 */
export async function generatePayoutBatch(
  { period, channel }: { period: string; channel: PayoutChannel },
  client: PrismaClient = prisma
): Promise<GeneratePayoutResult> {
  try {
    return await client.$transaction(async (tx) => {
    const existing = await tx.payoutBatch.findFirst({
      where: { period, channel },
      select: { id: true },
    });
    if (existing) throw new PayoutBatchExistsError(period, channel);

    const config = await tx.programConfig.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const minPayout = config?.minPayoutAmount ?? DEFAULT_MIN_PAYOUT_AMOUNT;

    const credits = await tx.customerCredit.findMany({
      where: {
        status: "PAYABLE",
        kind: "REFERRAL_COMMISSION",
        payoutBatchId: null,
        customerId: { not: null },
      },
      include: { customer: { select: { id: true, phone: true, name: true } } },
    });

    const byCustomer = new Map<
      string,
      { phone: string; name: string | null; amount: number; creditIds: string[] }
    >();
    for (const credit of credits) {
      if (!credit.customer) continue;
      const entry = byCustomer.get(credit.customer.id) ?? {
        phone: credit.customer.phone,
        name: credit.customer.name,
        amount: 0,
        creditIds: [],
      };
      entry.amount += credit.amount;
      entry.creditIds.push(credit.id);
      byCustomer.set(credit.customer.id, entry);
    }

    const eligible = [...byCustomer.entries()].filter(
      ([, entry]) => entry.amount >= minPayout
    );
    const skippedBelowThreshold = byCustomer.size - eligible.length;

    if (eligible.length === 0) {
      log.info("No PAYABLE credits above the payout threshold", {
        period,
        channel,
        minPayout,
        customersBelowThreshold: skippedBelowThreshold,
      });
      return { batch: null, lines: [], skippedBelowThreshold };
    }

    const totalAmount = eligible.reduce((sum, [, e]) => sum + e.amount, 0);
    const batch = await tx.payoutBatch.create({
      data: { period, channel, totalAmount, status: "DRAFT" },
    });

    // Claim the credits atomically — the payoutBatchId: null guard makes a
    // concurrent generator's claim come up short, which we detect and roll back.
    const eligibleCreditIds = eligible.flatMap(([, e]) => e.creditIds);
    const claimed = await tx.customerCredit.updateMany({
      where: {
        id: { in: eligibleCreditIds },
        payoutBatchId: null,
        status: "PAYABLE",
        kind: "REFERRAL_COMMISSION",
      },
      data: { payoutBatchId: batch.id },
    });
    if (claimed.count !== eligibleCreditIds.length) {
      throw new PayoutBatchRaceError();
    }

    log.info("Payout batch generated", {
      batchId: batch.id,
      period,
      channel,
      totalAmount,
      customers: eligible.length,
      credits: eligibleCreditIds.length,
      skippedBelowThreshold,
    });

    return {
      batch: {
        id: batch.id,
        period: batch.period,
        channel: batch.channel,
        totalAmount: batch.totalAmount,
        status: batch.status,
      },
      lines: eligible.map(([customerId, e]) => ({
        customerId,
        phone: e.phone,
        name: e.name,
        amount: e.amount,
        creditCount: e.creditIds.length,
      })),
      skippedBelowThreshold,
    };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PayoutBatchExistsError(period, channel);
    }
    throw error;
  }
}

/** Escape CSV syntax and neutralize spreadsheet formulas in user-supplied cells. */
function csvCell(value: string): string {
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Build the transfer CSV for a batch: one row per referrer, destination =
 * their phone number (B2/D4). Returns null when the batch doesn't exist.
 */
export async function buildPayoutBatchCsv(
  batchId: string,
  client: PrismaClient = prisma
): Promise<string | null> {
  const batch = await client.payoutBatch.findUnique({
    where: { id: batchId },
    include: {
      credits: {
        include: { customer: { select: { id: true, phone: true, name: true } } },
      },
    },
  });
  if (!batch) return null;

  const byCustomer = new Map<
    string,
    { phone: string; name: string | null; amount: number; creditCount: number }
  >();
  for (const credit of batch.credits) {
    if (!credit.customer) continue;
    const entry = byCustomer.get(credit.customer.id) ?? {
      phone: credit.customer.phone,
      name: credit.customer.name,
      amount: 0,
      creditCount: 0,
    };
    entry.amount += credit.amount;
    entry.creditCount += 1;
    byCustomer.set(credit.customer.id, entry);
  }

  const rows = [...byCustomer.values()].map(
    (e) =>
      `${csvCell(e.phone)},${csvCell(e.name ?? "")},${e.amount},${e.creditCount}`
  );
  return ["phone,name,amount,credit_count", ...rows].join("\n") + "\n";
}
