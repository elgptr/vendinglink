import { describe, it, expect } from "vitest";
import {
  buildSalesMap,
  groupByCategory,
  calculateCategoryScore,
  type ProductForCatalog,
} from "@/lib/catalogGrouping";

function product(p: Partial<ProductForCatalog>): ProductForCatalog {
  return {
    id: "p1",
    name: "Product",
    price: 100000,
    showOriginalPrice: false,
    description: null,
    stockCount: 10,
    categoryId: null,
    categorySlug: null,
    categoryName: null,
    ...p,
  };
}

describe("buildSalesMap", () => {
  it("counts only PAID transactions", () => {
    const map = buildSalesMap([
      { productId: "p1", status: "PAID", paidAt: new Date(), customerId: "c1" },
      { productId: "p1", status: "PENDING", paidAt: new Date(), customerId: "c1" },
      { productId: "p1", status: "CANCELLED", paidAt: new Date(), customerId: "c1" },
    ]);

    expect(map.get("p1")).toEqual({
      productId: "p1",
      unitsSold30d: 1,
      unitsSoldAllTime: 1,
      uniqueBuyers30d: 1,
    });
  });

  it("separates 30-day window from all-time", () => {
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

    const map = buildSalesMap([
      { productId: "p1", status: "PAID", paidAt: new Date(), customerId: "c1" },
      { productId: "p1", status: "PAID", paidAt: fortyDaysAgo, customerId: "c2" },
    ]);

    expect(map.get("p1")?.unitsSold30d).toBe(1);
    expect(map.get("p1")?.unitsSoldAllTime).toBe(2);
    expect(map.get("p1")?.uniqueBuyers30d).toBe(1);
  });

  it("counts distinct buyers within the window", () => {
    const map = buildSalesMap([
      { productId: "p1", status: "PAID", paidAt: new Date(), customerId: "c1" },
      { productId: "p1", status: "PAID", paidAt: new Date(), customerId: "c1" },
      { productId: "p1", status: "PAID", paidAt: new Date(), customerId: "c2" },
    ]);

    expect(map.get("p1")?.uniqueBuyers30d).toBe(2);
    expect(map.get("p1")?.unitsSold30d).toBe(3);
  });
});

describe("calculateCategoryScore", () => {
  it("uses the documented weights", () => {
    const score = calculateCategoryScore({
      productCount: 1,
      totalStock: 10,
      unitsSold30d: 10,
      unitsSoldAllTime: 20,
      uniqueBuyers30d: 5,
    });
    // 0.55*10 + 0.25*20 + 0.20*5 = 5.5 + 5 + 1 = 11.5
    expect(score).toBeCloseTo(11.5, 5);
  });
});

describe("groupByCategory", () => {
  it("groups products by category and puts uncategorised last", () => {
    const products: ProductForCatalog[] = [
      product({ id: "ai1", categoryId: "c-ai", categorySlug: "ai-tools", categoryName: "AI Tools" }),
      product({ id: "sub1", categoryId: "c-sub", categorySlug: "subscription", categoryName: "Subscription" }),
      product({ id: "un1", categoryId: null, categorySlug: "lainnya", categoryName: "Lainnya" }),
    ];

    const groups = groupByCategory(products, new Map());
    const slugs = groups.map((g) => g.categorySlug);

    expect(slugs).toHaveLength(3);
    expect(slugs[2]).toBe("lainnya");
  });

  it("ranks categories by composite score", () => {
    const products: ProductForCatalog[] = [
      product({ id: "sub1", categoryId: "c-sub", categorySlug: "subscription", categoryName: "Subscription" }),
      product({ id: "ai1", categoryId: "c-ai", categorySlug: "ai-tools", categoryName: "AI Tools" }),
    ];

    const sales = new Map([
      ["sub1", { productId: "sub1", unitsSold30d: 1, unitsSoldAllTime: 1, uniqueBuyers30d: 1 }],
      ["ai1", { productId: "ai1", unitsSold30d: 10, unitsSoldAllTime: 10, uniqueBuyers30d: 10 }],
    ]);

    const groups = groupByCategory(products, sales);
    expect(groups[0].categorySlug).toBe("ai-tools");
    expect(groups[1].categorySlug).toBe("subscription");
    expect(groups[0].rank).toBe(0);
    expect(groups[1].rank).toBe(1);
  });

  it("ties are broken by total stock then name", () => {
    const products: ProductForCatalog[] = [
      product({ id: "b1", categoryId: "c-b", categorySlug: "beta", categoryName: "Beta", stockCount: 5 }),
      product({ id: "a1", categoryId: "c-a", categorySlug: "alpha", categoryName: "Alpha", stockCount: 10 }),
    ];

    const groups = groupByCategory(products, new Map());
    expect(groups[0].categorySlug).toBe("alpha");
    expect(groups[1].categorySlug).toBe("beta");
  });

  it("aggregates sales per category across multiple products", () => {
    const products: ProductForCatalog[] = [
      product({ id: "ai1", categoryId: "c-ai", categorySlug: "ai-tools", categoryName: "AI Tools" }),
      product({ id: "ai2", categoryId: "c-ai", categorySlug: "ai-tools", categoryName: "AI Tools" }),
    ];

    const sales = new Map([
      ["ai1", { productId: "ai1", unitsSold30d: 3, unitsSoldAllTime: 5, uniqueBuyers30d: 2 }],
      ["ai2", { productId: "ai2", unitsSold30d: 2, unitsSoldAllTime: 4, uniqueBuyers30d: 1 }],
    ]);

    const groups = groupByCategory(products, sales);
    expect(groups).toHaveLength(1);
    expect(groups[0].meta.unitsSold30d).toBe(5);
    expect(groups[0].meta.unitsSoldAllTime).toBe(9);
    expect(groups[0].meta.uniqueBuyers30d).toBe(3);
  });
});
