import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

// Safety cap so a pathological retry storm can't hang a request forever.
const MAX_CLAIM_ATTEMPTS = 5;

/**
 * Atomically claim one AVAILABLE stock unit for a product using an
 * optimistic compare-and-swap.
 *
 * Postgres's default READ COMMITTED isolation means a plain
 * `findFirst(status: AVAILABLE)` followed by `update(where: { id })` is
 * NOT safe under concurrency: two simultaneous checkouts can both read the
 * same row as "available" before either writes, and a bare `update` by id
 * has no guard clause — the second writer would silently overwrite the
 * first sale, handing the exact same redeem link to two different buyers.
 *
 * Here we instead do `updateMany({ where: { id, status: AVAILABLE } })` and
 * check the affected row count. Only one concurrent caller can win that
 * write (the DB serializes the two UPDATE statements); the loser sees
 * `count === 0` and retries against the next candidate row.
 */
export async function claimAvailableStock(
  tx: TxClient,
  productId: string,
  claim: {
    claimedByAgentId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
  }
): Promise<{ id: string; redeemUrl: string } | null> {
  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    const candidate = await tx.redeemStock.findFirst({
      where: { productId, status: "AVAILABLE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, redeemUrl: true },
    });

    if (!candidate) {
      return null; // genuinely out of stock
    }

    const result = await tx.redeemStock.updateMany({
      where: { id: candidate.id, status: "AVAILABLE" },
      data: {
        status: "SOLD",
        claimedByAgentId: claim.claimedByAgentId ?? null,
        customerName: claim.customerName ?? null,
        customerPhone: claim.customerPhone ?? null,
        claimedAt: new Date(),
      },
    });

    if (result.count === 1) {
      return candidate; // won the race for this row
    }

    // Lost the race — another concurrent checkout claimed this exact row
    // between our findFirst and updateMany. Loop and try the next one.
  }

  return null;
}
