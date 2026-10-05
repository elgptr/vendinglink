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

    // Fetch supplier catalog in one bulk request
    let supplierCatalog: Awaited<ReturnType<typeof rezekiSupplier.getProducts>> = [];
    try {
      supplierCatalog = await rezekiSupplier.getProducts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("Failed to fetch supplier products for sync", { error: msg });
      result.errors.push(`Gagal mengambil data dari supplier: ${msg}`);
      return result;
    }

    const catalogMap = new Map<string, (typeof supplierCatalog)[number]>();
    for (const item of supplierCatalog) {
      catalogMap.set(item.supplierId, item);
    }

    const now = new Date();

    for (const product of products) {
      if (!product.supplierProductId) continue;

      const supplierItem = catalogMap.get(product.supplierProductId);
      let inStock = false;
      let stock = 0;

      if (supplierItem) {
        stock = supplierItem.stock;
        inStock = stock > 0;
      } else {
        // Fallback to single product check if not found in catalog list
        const singleCheck = await rezekiSupplier.checkProductStock(product.supplierProductId);
        if (singleCheck) {
          inStock = singleCheck.inStock;
          stock = singleCheck.stock;
        } else {
          inStock = false;
          stock = 0;
        }
      }

      if (inStock) {
        result.inStock++;
      } else {
        result.outOfStock++;
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
    }

    log.info("Supplier stock sync completed", { ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("Supplier stock sync encountered an unexpected error", { error: msg });
    result.errors.push(msg);
  }

  return result;
}