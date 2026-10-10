import { prisma } from "@/lib/prisma";

/**
 * Sentinel values the bridge uses when it cannot resolve a product.
 * These must be rejected before any auto-create or stock mutation.
 */
export const UNMAPPED_PRODUCT_ID = "[UNMAPPED]";
export const UNKNOWN_PRODUCT_ID = "[UNKNOWN]";

export async function resolveBridgeProduct(
  productId: string,
  supplierCode: string,
  supplierProductId: string
) {
  // 1. Try resolving via the new SupplierProductMapping table
  let mapping = await prisma.supplierProductMapping.findUnique({
    where: {
      supplierCode_supplierProductId: { supplierCode, supplierProductId }
    },
    include: { product: { select: { id: true, name: true, supplierMode: true, isActive: true } } }
  });

  if (mapping) {
    return { product: mapping.product, isNew: false };
  }

  // 2. Fallback: Try matching exactly by the VendingLink Product.id (legacy)
  let product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, supplierMode: true, isActive: true },
  });

  if (!product) {
    // 3. Fallback: try by Product.supplierProductId (legacy)
    product = await prisma.product.findFirst({
      where: {
        supplierProductId: supplierProductId,
        isActive: true,
      },
      select: { id: true, name: true, supplierMode: true, isActive: true },
    });
  }

  // 4. If still not found, we auto-create an inactive product AND bind it to mapping
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: `[BRIDGE AUTO] ${supplierCode}-${supplierProductId}`,
        price: 0,
        type: "LINK",
        supplierMode: "MANUAL",
        supplierProductId: supplierProductId,
        isActive: false, // Inactive so it doesn't show up in catalog
      },
      select: { id: true, name: true, supplierMode: true, isActive: true },
    });

    // Auto-bind the new product to the supplier mapping
    await prisma.supplierProductMapping.create({
      data: { supplierCode, supplierProductId, productId: product.id }
    });

    return { product, isNew: true };
  }

  // If found via fallback but not mapped yet, let's bind it so next time it's faster
  await prisma.supplierProductMapping.create({
    data: { supplierCode, supplierProductId, productId: product.id }
  }).catch(() => {}); // Ignore error if it somehow exists

  return { product, isNew: false };
}
