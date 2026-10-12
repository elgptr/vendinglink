import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// next-auth beta can't be resolved by Vitest's ESM loader, so stub lib/auth getClientIp
vi.mock("@/lib/auth", () => ({
  getClientIp: (r: NextRequest) =>
    r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    r.headers.get("x-real-ip") ||
    "127.0.0.1",
}));

import { POST as topupHandler } from "@/app/api/bridge/webhook/stock/topup/route";
import { PATCH as categoryHandler } from "@/app/api/bridge/products/[vlProductId]/category/route";
import { UNMAPPED_PRODUCT_ID, UNKNOWN_PRODUCT_ID } from "@/lib/bridge/productResolver";

describe("Prioritas 1: Uji Silang Kontrak Storefront ↔ Bridge (P1 Cross-Test)", () => {
  const prisma = new PrismaClient();
  const TEST_SECRET = "test_bridge_secret_key_cross_p1_98765";
  const originalEnv = process.env;

  let testCategory: { id: string; slug: string; name: string };
  let testProduct: { id: string; name: string; price: number };

  beforeAll(async () => {
    // Setup test category and product
    const categorySlug = `test-cat-p1-${Date.now()}`;
    testCategory = await prisma.category.create({
      data: {
        slug: categorySlug,
        name: "Test Category P1 Cross",
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: `Test Product P1 Cross ${Date.now()}`,
        price: 50000,
        type: "LINK",
        supplierMode: "MANUAL",
        categoryId: testCategory.id,
      },
    });

    // Create supplier mapping for testProduct
    await prisma.supplierProductMapping.create({
      data: {
        supplierCode: "RZK",
        supplierProductId: `rzk-p1-prod-${Date.now()}`,
        productId: testProduct.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created data
    await prisma.redeemStock.deleteMany({
      where: { productId: testProduct.id },
    });
    await prisma.supplierProductMapping.deleteMany({
      where: { productId: testProduct.id },
    });
    await prisma.product.deleteMany({
      where: { id: testProduct.id },
    });
    await prisma.category.deleteMany({
      where: { id: testCategory.id },
    });
    await prisma.bridgeInboundEvent.deleteMany({
      where: { transactionId: { startsWith: "cross-p1-" } },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BRIDGE_SECRET_KEY: TEST_SECRET,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createRequest(
    url: string,
    method: string,
    body: object,
    headers?: Record<string, string>
  ) {
    const reqHeaders = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${TEST_SECRET}`,
      ...headers,
    });

    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers: reqHeaders,
      body: JSON.stringify(body),
    });
  }

  // P1-T1: Top-up Stok Mapped -> 201 Created
  it("P1-T1: Top-up stok mapped sukses mengembalikan 201 Created dan menambah RedeemStock", async () => {
    const txId = `cross-p1-topup-${Date.now()}`;
    const req = createRequest(
      "http://localhost:3000/api/bridge/webhook/stock/topup",
      "POST",
      {
        transaction_id: txId,
        product_id: testProduct.id,
        supplier_code: "RZK",
        supplier_product_id: "rzk-sku-001",
        added_qty: 1,
        items: ["https://license.test.com/token-12345"],
        source: "BRIDGE_BOT",
      },
      { "Idempotency-Key": txId }
    );

    const res = await topupHandler(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.status).toBe(201);
    expect(json.message).toContain("Top-up successful");
    expect(json.inserted).toBe(1);

    // Verify RedeemStock created
    const stock = await prisma.redeemStock.findFirst({
      where: { productId: testProduct.id, bridgeTxId: txId },
    });
    expect(stock).toBeDefined();
    expect(stock?.redeemUrl).toBe("https://license.test.com/token-12345");

    // Verify BridgeInboundEvent status COMPLETED
    const event = await prisma.bridgeInboundEvent.findUnique({
      where: { transactionId: txId },
    });
    expect(event?.status).toBe("COMPLETED");
  });

  // P1-T2a: Replay Event COMPLETED -> 409 Conflict
  it("P1-T2a: Replay event yang sudah COMPLETED mengembalikan 409 Conflict dengan info event", async () => {
    const txId = `cross-p1-replay-completed-${Date.now()}`;

    // First request: Success 201
    const req1 = createRequest(
      "http://localhost:3000/api/bridge/webhook/stock/topup",
      "POST",
      {
        transaction_id: txId,
        product_id: testProduct.id,
        supplier_code: "RZK",
        supplier_product_id: "rzk-sku-002",
        added_qty: 1,
        items: ["https://license.test.com/token-replay-1"],
        source: "BRIDGE_BOT",
      }
    );
    const res1 = await topupHandler(req1);
    expect(res1.status).toBe(201);

    // Second request: Replay 409
    const req2 = createRequest(
      "http://localhost:3000/api/bridge/webhook/stock/topup",
      "POST",
      {
        transaction_id: txId,
        product_id: testProduct.id,
        supplier_code: "RZK",
        supplier_product_id: "rzk-sku-002",
        added_qty: 1,
        items: ["https://license.test.com/token-replay-1"],
        source: "BRIDGE_BOT",
      }
    );
    const res2 = await topupHandler(req2);
    expect(res2.status).toBe(409);

    const json2 = await res2.json();
    expect(json2.existingEvent?.status).toBe("COMPLETED");
    expect(json2.message).toContain("already completed");
  });

  // P1-T2b: Replay Event PROCESSING -> 409 Conflict
  it("P1-T2b: Replay event saat status PROCESSING mengembalikan 409 Conflict agar bridge retry backoff", async () => {
    const txId = `cross-p1-replay-proc-${Date.now()}`;

    // Seed an event in PROCESSING state
    await prisma.bridgeInboundEvent.create({
      data: {
        transactionId: txId,
        source: "BRIDGE_BOT",
        supplierCode: "RZK",
        supplierProductId: "rzk-sku-proc",
        externalProductId: testProduct.id,
        addedQty: 1,
        status: "PROCESSING",
      },
    });

    const req = createRequest(
      "http://localhost:3000/api/bridge/webhook/stock/topup",
      "POST",
      {
        transaction_id: txId,
        product_id: testProduct.id,
        supplier_code: "RZK",
        supplier_product_id: "rzk-sku-proc",
        added_qty: 1,
        items: ["https://license.test.com/token-proc-1"],
        source: "BRIDGE_BOT",
      }
    );

    const res = await topupHandler(req);
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.existingEvent?.status).toBe("PROCESSING");
    expect(json.message).toContain("already processing");
  });

  // P1-T3: Sentinel [UNMAPPED] & [UNKNOWN] -> 400 Rejection & REJECTED audit
  it("P1-T3: Sentinel [UNMAPPED] ditolak dengan 400 PRODUCT_NOT_MAPPED dan dicatat REJECTED", async () => {
    const txId = `cross-p1-unmapped-${Date.now()}`;
    const req = createRequest(
      "http://localhost:3000/api/bridge/webhook/stock/topup",
      "POST",
      {
        transaction_id: txId,
        product_id: UNMAPPED_PRODUCT_ID,
        supplier_code: "RZK",
        supplier_product_id: "unmapped-supplier-sku",
        added_qty: 1,
        items: ["https://license.test.com/token-unmapped"],
        source: "BRIDGE_BOT",
      }
    );

    const res = await topupHandler(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.code).toBe("PRODUCT_NOT_MAPPED");

    // Event audit in DB must be REJECTED
    const event = await prisma.bridgeInboundEvent.findUnique({
      where: { transactionId: txId },
    });
    expect(event?.status).toBe("REJECTED");
  });

  it("P1-T3: Sentinel [UNKNOWN] ditolak dengan 400 PRODUCT_ID_SENTINEL_UNKNOWN dan dicatat REJECTED", async () => {
    const txId = `cross-p1-unknown-${Date.now()}`;
    const req = createRequest(
      "http://localhost:3000/api/bridge/webhook/stock/topup",
      "POST",
      {
        transaction_id: txId,
        product_id: UNKNOWN_PRODUCT_ID,
        supplier_code: "PDA",
        supplier_product_id: "unknown-supplier-sku",
        added_qty: 1,
        items: ["https://license.test.com/token-unknown"],
        source: "BRIDGE_BOT",
      }
    );

    const res = await topupHandler(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.code).toBe("PRODUCT_ID_SENTINEL_UNKNOWN");

    const event = await prisma.bridgeInboundEvent.findUnique({
      where: { transactionId: txId },
    });
    expect(event?.status).toBe("REJECTED");
  });

  // P1-T4: Sinkronisasi Kategori -> 200 OK
  it("P1-T4: PATCH category mengaitkan vlProductId ke kategori yang valid", async () => {
    const newCategorySlug = `new-cat-p1-${Date.now()}`;
    const newCat = await prisma.category.create({
      data: {
        slug: newCategorySlug,
        name: "New Category P1 Update",
      },
    });

    const req = createRequest(
      `http://localhost:3000/api/bridge/products/${testProduct.id}/category`,
      "PATCH",
      { categorySlug: newCategorySlug }
    );

    const res = await categoryHandler(req, {
      params: Promise.resolve({ vlProductId: testProduct.id }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe(200);
    expect(json.categorySlug).toBe(newCategorySlug);

    // Verify DB update
    const updatedProd = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(updatedProd?.categoryId).toBe(newCat.id);

    // Cleanup extra category
    await prisma.category.delete({ where: { id: newCat.id } });
  });

  // P1-T5: Keamanan & Otorisasi
  it("P1-T5: Request tanpa Bearer token ditolak dengan 401 Unauthorized", async () => {
    const txId = `cross-p1-no-auth-${Date.now()}`;
    const req = new NextRequest("http://localhost:3000/api/bridge/webhook/stock/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_id: txId,
        product_id: testProduct.id,
        supplier_code: "RZK",
        supplier_product_id: "sku-no-auth",
        added_qty: 1,
        items: ["https://license.test.com/key"],
        source: "BRIDGE_BOT",
      }),
    });

    const res = await topupHandler(req);
    expect(res.status).toBe(401);
  });

  it("P1-T5: Request dengan Idempotency-Key header tidak cocok dengan transaction_id ditolak 400", async () => {
    const txId = `cross-p1-mismatch-${Date.now()}`;
    const req = createRequest(
      "http://localhost:3000/api/bridge/webhook/stock/topup",
      "POST",
      {
        transaction_id: txId,
        product_id: testProduct.id,
        supplier_code: "RZK",
        supplier_product_id: "sku-mismatch",
        added_qty: 1,
        items: ["https://license.test.com/key"],
        source: "BRIDGE_BOT",
      },
      { "Idempotency-Key": "DIFFERENT-TX-ID-999" }
    );

    const res = await topupHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Idempotency-Key");
  });
});
