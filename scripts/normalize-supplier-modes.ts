/**
 * scripts/normalize-supplier-modes.ts
 *
 * Cleanup 6 Data Normalization:
 * Safely normalizes all existing products with legacy supplier modes (REZEKI, AUTO)
 * to "MANUAL".
 *
 * Safe for Production:
 * - Preserves supplierProductId (used by Bridge for mapping).
 * - Non-destructive (does NOT drop columns or delete rows).
 * - Idempotent (can be run multiple times safely).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking products with non-MANUAL supplier modes...");

  const nonManualProducts = await prisma.product.findMany({
    where: {
      supplierMode: {
        not: "MANUAL",
      },
    },
    select: {
      id: true,
      name: true,
      supplierMode: true,
      supplierProductId: true,
    },
  });

  console.log(`Found ${nonManualProducts.length} product(s) needing normalization:`);
  for (const p of nonManualProducts) {
    console.log(` - [${p.id}] "${p.name}" (mode: ${p.supplierMode}, supplierProductId: ${p.supplierProductId ?? "none"})`);
  }

  if (nonManualProducts.length > 0) {
    const updateResult = await prisma.product.updateMany({
      where: {
        supplierMode: {
          not: "MANUAL",
        },
      },
      data: {
        supplierMode: "MANUAL",
      },
    });

    console.log(`✅ Successfully normalized ${updateResult.count} product(s) to supplierMode: "MANUAL".`);
  } else {
    console.log("✅ All products are already set to supplierMode: \"MANUAL\". No updates needed.");
  }

  // Verification check
  const remaining = await prisma.product.count({
    where: {
      supplierMode: {
        not: "MANUAL",
      },
    },
  });

  if (remaining === 0) {
    console.log("🎉 Verification passed: 100% of products now have supplierMode = 'MANUAL'.");
  } else {
    console.error(`⚠️ Verification failed: ${remaining} product(s) still have non-MANUAL mode.`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("❌ Normalization error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
