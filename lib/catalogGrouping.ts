/**
 * Catalog grouping and ranking logic.
 *
 * The current "popularity" signal is a proxy because the schema has no
 * impression/click tracking. The composite score intentionally leaves a
 * slot for a future `popularityScore` field without changing the shape of
 * the exported function:
 *
 *   score = 0.55 * unitsSold30d
 *         + 0.25 * unitsSoldAllTime
 *         + 0.20 * uniqueBuyers30d
 *
 * When real popularity data exists, replace the `uniqueBuyers30d` weight
 * with the tracked metric and keep the same interface.
 */

export interface ProductForCatalog {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  showOriginalPrice: boolean;
  description: string | null;
  stockCount: number;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}

export interface CategoryGroup {
  /** Display order: 0 = top/best selling. */
  rank: number;
  categoryId: string | null;
  categorySlug: string;
  categoryName: string;
  products: ProductForCatalog[];
  meta: {
    productCount: number;
    totalStock: number;
    unitsSold30d: number;
    unitsSoldAllTime: number;
    uniqueBuyers30d: number;
  };
}

export interface SalesAggregate {
  productId: string;
  unitsSold30d: number;
  unitsSoldAllTime: number;
  uniqueBuyers30d: number;
}

const SCORE_WEIGHT_30D = 0.55;
const SCORE_WEIGHT_ALL_TIME = 0.25;
const SCORE_WEIGHT_BUYERS = 0.20;

export function calculateCategoryScore(meta: CategoryGroup["meta"]): number {
  return (
    SCORE_WEIGHT_30D * meta.unitsSold30d +
    SCORE_WEIGHT_ALL_TIME * meta.unitsSoldAllTime +
    SCORE_WEIGHT_BUYERS * meta.uniqueBuyers30d
  );
}

function getNowAndWindowDays(days: number): { now: Date; windowStart: Date } {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(now.getDate() - days);
  windowStart.setHours(0, 0, 0, 0);
  return { now, windowStart };
}

/**
 * Build a sales map from raw Prisma Transaction rows.
 * Accepts any object with at least the required fields so the function
 * stays testable without importing the full Prisma client.
 */
export function buildSalesMap(
  transactions: Array<{
    productId: string;
    status: string;
    paidAt?: Date | null;
    customerId?: string | null;
  }>
): Map<string, SalesAggregate> {
  const { windowStart } = getNowAndWindowDays(30);
  const map = new Map<string, SalesAggregate>();

  for (const tx of transactions) {
    if (tx.status !== "PAID") continue;

    const isInWindow = tx.paidAt ? new Date(tx.paidAt) >= windowStart : false;
    const agg = map.get(tx.productId) ?? {
      productId: tx.productId,
      unitsSold30d: 0,
      unitsSoldAllTime: 0,
      uniqueBuyers30d: 0,
    };

    agg.unitsSoldAllTime += 1;

    if (isInWindow) {
      agg.unitsSold30d += 1;
    }

    map.set(tx.productId, agg);
  }

  // Second pass for distinct buyers per product within the window.
  // Doing it in two passes keeps the function deterministic and avoids
  // carrying heavy Set state through the loop.
  const buyerSets = new Map<string, Set<string>>();
  for (const tx of transactions) {
    if (tx.status !== "PAID" || !tx.customerId) continue;
    const paidAt = tx.paidAt ? new Date(tx.paidAt) : null;
    if (!paidAt || paidAt < windowStart) continue;

    if (!buyerSets.has(tx.productId)) {
      buyerSets.set(tx.productId, new Set<string>());
    }
    buyerSets.get(tx.productId)!.add(tx.customerId);
  }

  for (const [productId, buyers] of buyerSets) {
    const agg = map.get(productId);
    if (agg) agg.uniqueBuyers30d = buyers.size;
  }

  return map;
}

function isUncategorized(group: CategoryGroup): boolean {
  return group.categoryId === null;
}

export function groupByCategory(
  products: ProductForCatalog[],
  salesMap: Map<string, SalesAggregate>
): CategoryGroup[] {
  const buckets = new Map<string, CategoryGroup>();

  for (const product of products) {
    const slug = product.categorySlug?.toLowerCase().trim() || "lainnya";
    const name = product.categoryName || "Lainnya";
    const key = product.categoryId ?? `__uncategorized__`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        rank: 0,
        categoryId: product.categoryId ?? null,
        categorySlug: slug,
        categoryName: name,
        products: [],
        meta: {
          productCount: 0,
          totalStock: 0,
          unitsSold30d: 0,
          unitsSoldAllTime: 0,
          uniqueBuyers30d: 0,
        },
      });
    }

    const bucket = buckets.get(key)!;
    bucket.products.push(product);
    bucket.meta.productCount += 1;
    bucket.meta.totalStock += Math.max(0, product.stockCount);

    const sales = salesMap.get(product.id);
    if (sales) {
      bucket.meta.unitsSold30d += sales.unitsSold30d;
      bucket.meta.unitsSoldAllTime += sales.unitsSoldAllTime;
      bucket.meta.uniqueBuyers30d += sales.uniqueBuyers30d;
    }
  }

  // Tie-break rules (in order):
  // 1. Composite score (laris + populer proxy)
  // 2. Total available stock
  // 3. Category name ascending (stable, predictable)
  // 4. Uncategorized bucket always ranks last, regardless of name sort.
  const ranked = Array.from(buckets.values())
    .map((group) => ({
      ...group,
      score: calculateCategoryScore(group.meta),
    }))
    .sort((a, b) => {
      // Keep uncategorized last so it does not jump above real categories
      // just because "Lainnya" sorts early alphabetically.
      if (isUncategorized(a) && !isUncategorized(b)) return 1;
      if (!isUncategorized(a) && isUncategorized(b)) return -1;

      if (b.score !== a.score) return b.score - a.score;
      if (b.meta.totalStock !== a.meta.totalStock) {
        return b.meta.totalStock - a.meta.totalStock;
      }
      return a.categoryName.localeCompare(b.categoryName);
    })
    .map((group, index) => ({ ...group, rank: index }));

  return ranked.map(({ score: _, ...rest }) => rest);
}

export function getCategoryAnchorId(slug: string): string {
  return `cat-${slug}`;
}
