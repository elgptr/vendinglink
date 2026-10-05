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

  const isAvailable =
    product.isSupplierAvailable !== false &&
    (product.supplierLastCheckedAt === null || (product.supplierStock ?? 0) > 0);

  const supplierCount = isAvailable
    ? (product.supplierStock && product.supplierStock > 0 ? product.supplierStock : 999)
    : 0;

  if (mode === "REZEKI") {
    return supplierCount;
  }

  if (mode === "AUTO") {
    return manualCount + supplierCount;
  }

  return manualCount;
}