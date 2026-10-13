import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { calculateProductStock } from "@/lib/productStock";
import { POST as customerCheckout } from "@/app/api/checkout/customer/route";
import { handleStockTopup } from "@/lib/bridge/topup";
import {
  createMockProduct,
  createMockStock,
  cleanupTestDatabase,
} from "../helpers/fixtures";

// Mocks
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }),
}));

vi.mock("@/lib/midtrans", () => ({
  createSnapTransaction: vi.fn(async () => ({ token: "test-snap-token-cleanup" })),
  getMidtransStatus: vi.fn(),
}));

vi.mock("@/lib/doku", () => ({ createDokuCheckout: vi.fn() }));
vi.mock("@/lib/kasera", () => ({
  createKaseraQrisPayment: vi.fn(),
  getKaseraPaymentStatus: vi.fn(),
}));

vi.mock("@/lib/paymentConfig", () => ({
  getActivePaymentGateway: () => "MIDTRANS",
}));

vi.mock("@/lib/csrf", () => ({
  verifyCsrfRequest: () => true,
  extractCsrfTokens: () => ({ cookieToken: "t", submittedToken: "t" }),
}));

vi.mock("@/lib/whatsapp", () => ({
  sendPaymentNotification: vi.fn(async () => ({ sent: true, mode: "mock" })),
  sendBridgeNewProductAlert: vi.fn(async () => ({ sent: true, mode: "mock" })),
}));

describe("Cleanup 6: Supplier Modes (AUTO & REZEKI) Safely Deprecated", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  describe("1. calculateProductStock decoupling", () => {
    it("strictly uses local stocks count regardless of supplierMode or supplierStock", () => {
      // Case 1: Product with legacy REZEKI mode and high supplierStock but 0 local stocks
      const stock1 = calculateProductStock({
        supplierMode: "REZEKI",
        supplierStock: 999,
        isSupplierAvailable: true,
        stocksCount: 0,
        _count: { stocks: 0 },
      });
      expect(stock1).toBe(0);

      // Case 2: Product with legacy AUTO mode, 5 local stocks, 100 supplierStock
      const stock2 = calculateProductStock({
        supplierMode: "AUTO",
        supplierStock: 100,
        isSupplierAvailable: true,
        stocksCount: 5,
        _count: { stocks: 5 },
      });
      expect(stock2).toBe(5);

      // Case 3: Product with MANUAL mode, 12 local stocks
      const stock3 = calculateProductStock({
        supplierMode: "MANUAL",
        stocksCount: 12,
        _count: { stocks: 12 },
      });
      expect(stock3).toBe(12);
    });
  });

  describe("2. Customer checkout route stock verification", () => {
    it("rejects checkout with 400 when local RedeemStock is 0", async () => {
      const emptyProduct = await createMockProduct(prisma, {
        name: "Produk Tanpa Stok",
        price: 50000,
        supplierMode: "MANUAL",
      });

      const req = new NextRequest("http://localhost:3000/api/checkout/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.88.1.1",
        },
        body: JSON.stringify({
          productId: emptyProduct.id,
          customerName: "Budi",
          customerPhone: "08123456789",
        }),
      });

      const res = await customerCheckout(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Stok produk habis");
    });

    it("allows checkout and creates snap token when local RedeemStock is available", async () => {
      const stockedProduct = await createMockProduct(prisma, {
        name: "Produk Ada Stok",
        price: 60000,
        supplierMode: "MANUAL",
      });
      await createMockStock(prisma, stockedProduct.id, 2);

      const req = new NextRequest("http://localhost:3000/api/checkout/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.88.1.2",
        },
        body: JSON.stringify({
          productId: stockedProduct.id,
          customerName: "Andi",
          customerPhone: "08123456789",
        }),
      });

      const res = await customerCheckout(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.snapToken).toBe("test-snap-token-cleanup");
      expect(data.orderId).toBeDefined();
    });
  });

  describe("3. Bridge topup inbound no longer blocked by REZEKI mode", () => {
    it("successfully accepts topup and normalizes product to MANUAL without 400 rejection", async () => {
      const legacyProduct = await createMockProduct(prisma, {
        name: "Legacy Rezeki Product",
        price: 75000,
        supplierMode: "REZEKI",
        supplierProductId: "rzk-legacy-sku-1",
      });

      const txId = `bridge-topup-cleanup-${Date.now()}`;
      const result = await handleStockTopup({
        transaction_id: txId,
        product_id: legacyProduct.id,
        supplier_code: "RZK",
        supplier_product_id: "rzk-legacy-sku-1",
        added_qty: 2,
        items: [
          `https://example.com/redeem/bridge-key-1-${Date.now()}`,
          `https://example.com/redeem/bridge-key-2-${Date.now()}`,
        ],
        source: "BRIDGE_BOT",
      });

      expect(result.status).toBe(201);
      expect(result.message).toBe("Top-up successful");
      expect(result.inserted).toBe(2);

      // Verify product mode was normalized to MANUAL
      const updatedProduct = await prisma.product.findUnique({
        where: { id: legacyProduct.id },
      });
      expect(updatedProduct?.supplierMode).toBe("MANUAL");

      // Verify stocks were actually inserted into RedeemStock
      const stocksInDb = await prisma.redeemStock.count({
        where: { productId: legacyProduct.id },
      });
      expect(stocksInDb).toBe(2);
    });
  });

  describe("4. Database integrity & normalization idempotency", () => {
    it("preserves supplierProductId and safely normalizes all non-MANUAL products", async () => {
      // Create a test product with supplierMode AUTO and supplierProductId
      const testProd = await createMockProduct(prisma, {
        name: "Auto Mode Product",
        price: 80000,
        supplierMode: "AUTO",
        supplierProductId: "bridge-sku-keep-safe",
      });

      // Run normalization logic
      const updateResult = await prisma.product.updateMany({
        where: { supplierMode: { not: "MANUAL" } },
        data: { supplierMode: "MANUAL" },
      });

      expect(updateResult.count).toBeGreaterThanOrEqual(1);

      // Verify product
      const normalized = await prisma.product.findUnique({
        where: { id: testProd.id },
      });
      expect(normalized?.supplierMode).toBe("MANUAL");
      // supplierProductId MUST be preserved for Bridge mapping!
      expect(normalized?.supplierProductId).toBe("bridge-sku-keep-safe");
    });
  });
});
