export function calculateProductStock(product: {
  supplierMode?: string | null;
  supplierStock?: number | null;
  isSupplierAvailable?: boolean | null;
  supplierLastCheckedAt?: Date | null;
  _count?: { stocks: number } | null;
  stocksCount?: number | null;
}): number {
  const manualCount = product._count?.stocks ?? product.stocksCount ?? 0;
  const mode = product.supplierMode ?? "MANUAL";

  if (mode === "MANUAL") {
    return manualCount;
  }

  // If supplier is explicitly unavailable or stock is <= 0
  const isAvailable = product.isSupplierAvailable === true && (product.supplierStock ?? 0) > 0;
  const supplierCount = isAvailable ? (product.supplierStock ?? 0) : 0;

  if (mode === "REZEKI") {
    return supplierCount;
  }

  if (mode === "AUTO") {
    return manualCount + supplierCount;
  }

  return manualCount;
}