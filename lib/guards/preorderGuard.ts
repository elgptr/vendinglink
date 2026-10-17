import { prisma } from "@/lib/prisma";
import { calculateProductStock } from "@/lib/productStock";

export interface ActiveRequestCheckResult {
  allowed: boolean;
  activeRequest?: {
    id: string;
    productName: string;
    trackingToken?: string | null;
    status: string;
  };
  reason?: string;
}

export interface StockCheckResult {
  allowed: boolean;
  inStock?: boolean;
  stockCount?: number;
  productId?: string;
  reason?: string;
}

/**
 * Guard 1: Enforce maximum 1 active pre-order request per customer phone.
 * Active states: SEARCHING, FOUND.
 */
export async function assertNoExistingActiveRequest(
  customerPhone: string
): Promise<ActiveRequestCheckResult> {
  const active = await prisma.customerProductRequest.findFirst({
    where: {
      customerPhone,
      status: { in: ["SEARCHING", "FOUND"] },
      isInvalidated: false,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      productName: true,
      trackingToken: true,
      status: true,
    },
  });

  if (active) {
    return {
      allowed: false,
      activeRequest: active,
      reason: `Anda masih memiliki permintaan aktif untuk produk "${active.productName}". Silakan pantau halaman tracking atau tunggu hingga selesai sebelum mengajukan produk lain.`,
    };
  }

  return { allowed: true };
}

/**
 * Guard 2: Prevent pre-order if the product currently has real stock available in Storefront.
 */
export async function assertProductNeedsPreOrder(
  productId?: string | null
): Promise<StockCheckResult> {
  if (!productId) {
    return { allowed: true };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      isActive: true,
      supplierMode: true,
      supplierStock: true,
      isSupplierAvailable: true,
      supplierLastCheckedAt: true,
    },
  });

  if (!product || !product.isActive) {
    return { allowed: true };
  }

  const availableRedeemStocks = await prisma.redeemStock.count({
    where: {
      productId: product.id,
      status: "AVAILABLE",
    },
  });

  const stockCount = calculateProductStock({
    ...product,
    stocksCount: availableRedeemStocks,
  });

  if (stockCount > 0) {
    return {
      allowed: false,
      inStock: true,
      stockCount,
      productId: product.id,
      reason: `Stok untuk produk "${product.name}" saat ini sudah tersedia (${stockCount} unit) di etalase! Silakan langsung beli tanpa perlu pre-order.`,
    };
  }

  return { allowed: true };
}
