import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/auth", () => ({
  getClientIp: (r: NextRequest) =>
    r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    r.headers.get("x-real-ip") ||
    "127.0.0.1",
}));

import { PATCH } from "@/app/api/bridge/products/[vlProductId]/category/route";

function authHeader() {
  return { Authorization: `Bearer ${process.env.BRIDGE_SECRET_KEY}` };
}

function categoryPatch(vlProductId: string, body: unknown) {
  return new NextRequest(
    `http://localhost:3000/api/bridge/products/${vlProductId}/category`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
        ...authHeader(),
      },
      body: JSON.stringify(body),
    }
  );
}

describe("PATCH /api/bridge/products/:vlProductId/category", () => {
  let prisma: PrismaClient;
  let productId: string;
  let categoryId: string;
  const slug = `test-category-${Date.now()}`;

  beforeAll(async () => {
    process.env.BRIDGE_SECRET_KEY = "test-bridge-secret";
    prisma = new PrismaClient();

    const product = await prisma.product.create({
      data: { name: "Category Test Product", price: 10000, type: "LINK" },
    });
    productId = product.id;

    const category = await prisma.category.create({
      data: { slug, name: "Test Category" },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("returns 200 and persists categoryId on valid slug", async () => {
    const req = categoryPatch(productId, { categorySlug: slug });
    const res = await PATCH(req, { params: Promise.resolve({ vlProductId: productId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.productId).toBe(productId);
    expect(json.categoryId).toBe(categoryId);
    expect(json.categorySlug).toBe(slug);

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    expect(updated?.categoryId).toBe(categoryId);
  });

  it("returns 404 CATEGORY_NOT_FOUND for unknown slug and creates no category", async () => {
    const beforeCount = await prisma.category.count();
    const req = categoryPatch(productId, { categorySlug: "does-not-exist" });
    const res = await PATCH(req, { params: Promise.resolve({ vlProductId: productId }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("CATEGORY_NOT_FOUND");

    const afterCount = await prisma.category.count();
    expect(afterCount).toBe(beforeCount);
  });

  it("returns 404 PRODUCT_NOT_FOUND for unknown vlProductId", async () => {
    const req = categoryPatch("nonexistent-product-id", { categorySlug: slug });
    const res = await PATCH(req, { params: Promise.resolve({ vlProductId: "nonexistent-product-id" }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("PRODUCT_NOT_FOUND");
  });

  it("returns 401 for missing bearer token", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/bridge/products/${productId}/category`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
        body: JSON.stringify({ categorySlug: slug }),
      }
    );
    const res = await PATCH(req, { params: Promise.resolve({ vlProductId: productId }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 INVALID_BODY for missing categorySlug", async () => {
    const req = categoryPatch(productId, {});
    const res = await PATCH(req, { params: Promise.resolve({ vlProductId: productId }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("INVALID_BODY");
  });
});
