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
      // ── Low Stock Alert Check ──
      const remainingCount = await tx.redeemStock.count({
        where: { productId, status: "AVAILABLE" },
      });
      
      const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || "5", 10);
      
      // We only alert exactly when it hits the threshold to avoid spamming on every checkout below threshold.
      // E.g. if threshold is 5, we only alert when remaining count drops from 6 to 5.
      // We also alert if the stock drops exactly to 0.
      if (remainingCount === LOW_STOCK_THRESHOLD || remainingCount === 0) {
        // Fetch product name safely outside the critical path if needed, but we can do it inside tx
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { name: true }
        });
        
        if (product) {
          // Dynamic import to avoid circular dependencies if any
          import("@/lib/whatsapp").then((wa) => {
            wa.sendAdminLowStockAlert(product.name, remainingCount, remainingCount === 0).catch((e) => {
              console.error("Failed to send low stock alert:", e);
            });
          });
        }
      }

      return candidate; // won the race for this row
    }

    // Lost the race — another concurrent checkout claimed this exact row
    // between our findFirst and updateMany. Loop and try the next one.
  }

  return null;
}

/**
 * Atomically claim multiple AVAILABLE stock units for a product using an
 * optimistic compare-and-swap.
 */
export async function claimAvailableStockBatch(
  tx: TxClient,
  productId: string,
  quantity: number,
  claim: {
    claimedByAgentId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
  }
): Promise<{ id: string; redeemUrl: string }[] | null> {
  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    const candidates = await tx.redeemStock.findMany({
      where: { productId, status: "AVAILABLE" },
      orderBy: { createdAt: "asc" },
      take: quantity,
      select: { id: true, redeemUrl: true },
    });

    if (candidates.length < quantity) {
      return null; // genuinely out of stock for the requested quantity
    }

    const candidateIds = candidates.map((c) => c.id);

    const result = await tx.redeemStock.updateMany({
      where: { id: { in: candidateIds }, status: "AVAILABLE" },
      data: {
        status: "SOLD",
        claimedByAgentId: claim.claimedByAgentId ?? null,
        customerName: claim.customerName ?? null,
        customerPhone: claim.customerPhone ?? null,
        claimedAt: new Date(),
      },
    });

    if (result.count === quantity) {
      // ── Low Stock Alert Check ──
      const remainingCount = await tx.redeemStock.count({
        where: { productId, status: "AVAILABLE" },
      });
      
      const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || "5", 10);
      
      const crossesThreshold = remainingCount <= LOW_STOCK_THRESHOLD && remainingCount + quantity > LOW_STOCK_THRESHOLD;
      const crossesZero = remainingCount === 0;

      if (crossesThreshold || crossesZero) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { name: true }
        });
        
        if (product) {
          import("@/lib/whatsapp").then((wa) => {
            wa.sendAdminLowStockAlert(product.name, remainingCount, remainingCount === 0).catch((e) => {
              console.error("Failed to send low stock alert:", e);
            });
          });
        }
      }

      return candidates; // won the race for all requested rows
    }

    // Lost the race - loop and try again
  }

  return null;
}
