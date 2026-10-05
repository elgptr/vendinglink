import { prisma } from "@/lib/prisma";
import { rezekiSupplier } from "@/lib/suppliers";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "supplier-sync" });

export interface SyncResult {
  totalChecked: number;
  updated: number;
  outOfStock: number;
  inStock: number;
  errors: string[];
}

export async function syncSupplierStocks(): Promise<SyncResult> {
  const result: SyncResult = {
    totalChecked: 0,
    updated: 0,
    outOfStock: 0,
    inStock: 0,
    errors: [],
  };

  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        supplierMode: { in: ["REZEKI", "AUTO"] },
        supplierProductId: { not: null },
      },
    });

    if (products.length === 0) {
      return result;
    }

    result.totalChecked = products.length;
    const now = new Date();

    for (const product of products) {
      if (!product.supplierProductId) continue;

      try {
        // Query the real-time detail endpoint: GET /v1/products/{id}
        const check = await rezekiSupplier.checkProductStock(product.supplierProductId);

        let inStock = false;
        let stock = 0;

        if (check) {
          inStock = check.inStock;
          stock = check.stock;
        }

        if (inStock && stock > 0) {
          result.inStock++;
        } else {
          result.outOfStock++;
          inStock = false;
          stock = 0;
        }

        await prisma.product.update({
          where: { id: product.id },
          data: {
            supplierStock: stock,
            isSupplierAvailable: inStock,
            supplierLastCheckedAt: now,
          },
        });

        result.updated++;
      } catch (itemErr) {
        const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
        log.error("Failed to check stock for product", {
          productId: product.id,
          supplierProductId: product.supplierProductId,
          error: msg,
        });
        result.errors.push(`Produk ${product.name}: ${msg}`);
      }
    }

    log.info("Supplier stock sync completed", { ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("Supplier stock sync encountered an unexpected error", { error: msg });
    result.errors.push(msg);
  }

  return result;
}