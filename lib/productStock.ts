/**
 * Calculates available stock for a product from local RedeemStock.
 * In VendingLink Storefront, all products operate with local inventory (MANUAL)
 * fulfilled asynchronously by manual upload or vendinglink_bridge.
 */
export function calculateProductStock(product: {
  supplierMode?: string | null;
  supplierStock?: number | null;
  isSupplierAvailable?: boolean | null;
  supplierLastCheckedAt?: Date | null;
  _count?: { stocks: number } | null;
  stocksCount?: number | null;
}): number {
  return product._count?.stocks ?? product.stocksCount ?? 0;
}