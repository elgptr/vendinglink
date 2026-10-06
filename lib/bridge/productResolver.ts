import { prisma } from "@/lib/prisma";

export async function resolveBridgeProduct(
  productId: string,
  supplierCode: string,
  supplierProductId: string
) {
  // First, try matching exactly by the VendingLink Product.id (which bridge sends as product_id if they have a map)
  let product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, supplierMode: true, isActive: true },
  });

  if (!product) {
    // Second, try matching by supplierProductId. 
    product = await prisma.product.findFirst({
      where: {
        supplierProductId: supplierProductId,
        isActive: true,
      },
      select: { id: true, name: true, supplierMode: true, isActive: true },
    });
  }

  // If still not found, we auto-create an inactive product
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
    return { product, isNew: true };
  }

  return { product, isNew: false };
}
