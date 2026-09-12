import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";
import { createMockProduct, createMockTransaction, createMockStock, cleanupTestDatabase } from "../helpers/fixtures";

describe("transactionStatus.ts — applyMidtransStatusUpdate", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("should return NOT_FOUND for non-existent order", async () => {
    const result = await applyMidtransStatusUpdate("NON-EXISTENT-ORDER", "settlement");
    expect(result.updated).toBe(false);
    if (!result.updated) {
      expect(result.reason).toBe("NOT_FOUND");
    }
  });

  it("should return ALREADY_PROCESSED for PAID transaction", async () => {
    const product = await createMockProduct(prisma);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PAID",
    });

    const result = await applyMidtransStatusUpdate(transaction.orderId, "settlement");
    expect(result.updated).toBe(false);
    if (!result.updated) {
      expect(result.reason).toBe("ALREADY_PROCESSED");
    }
  });

  it("should return ALREADY_PROCESSED for CANCELLED transaction", async () => {
    const product = await createMockProduct(prisma);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "CANCELLED",
    });

    const result = await applyMidtransStatusUpdate(transaction.orderId, "settlement");
    expect(result.updated).toBe(false);
    if (!result.updated) {
      expect(result.reason).toBe("ALREADY_PROCESSED");
    }
  });

  it("should mark transaction as EXPIRED for cancel status", async () => {
    const product = await createMockProduct(prisma);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
    });

    const result = await applyMidtransStatusUpdate(transaction.orderId, "cancel");
    expect(result.updated).toBe(true);
    if (result.updated) {
      expect(result.transaction.status).toBe("EXPIRED");
    }
  });

  it("should mark transaction as EXPIRED for deny status", async () => {
    const product = await createMockProduct(prisma);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
    });

    const result = await applyMidtransStatusUpdate(transaction.orderId, "deny");
    expect(result.updated).toBe(true);
    if (result.updated) {
      expect(result.transaction.status).toBe("EXPIRED");
    }
  });

  it("should update PAID with settlement status and stock fulfilled", async () => {
    const product = await createMockProduct(prisma);
    const stocks = await createMockStock(prisma, product.id, 1);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
      paymentType: "MIDTRANS",
    });

    const result = await applyMidtransStatusUpdate(transaction.orderId, "settlement");
    expect(result.updated).toBe(true);
    if (result.updated) {
      expect(result.transaction.status).toBe("PAID");
      expect(result.transaction.stockStatus).toBe("FULFILLED");
      expect(result.transaction.redeemUrl).toBe(stocks[0].redeemUrl);
      expect(result.transaction.paidAt).toBeDefined();
    }

    const updatedStock = await prisma.redeemStock.findUnique({
      where: { id: stocks[0].id },
    });
    expect(updatedStock?.status).toBe("SOLD");
  });

  it("should update PAID with capture status and fraud_status=accept", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 1);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
      paymentType: "MIDTRANS",
    });

    const result = await applyMidtransStatusUpdate(transaction.orderId, "capture", "accept");
    expect(result.updated).toBe(true);
    if (result.updated) {
      expect(result.transaction.status).toBe("PAID");
      expect(result.transaction.stockStatus).toBe("FULFILLED");
    }
  });

  it("should return NOT_YET_SETTLED for pending status", async () => {
    const product = await createMockProduct(prisma);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
    });

    const result = await applyMidtransStatusUpdate(transaction.orderId, "pending");
    expect(result.updated).toBe(false);
    if (!result.updated) {
      expect(result.reason).toBe("NOT_YET_SETTLED");
    }
  });

  it("should create STOCKOUT_REFUND promo code when out of stock", async () => {
    const product = await createMockProduct(prisma);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
      paymentType: "MIDTRANS",
      finalAmount: 100000,
    });

    const result = await applyMidtransStatusUpdate(transaction.orderId, "settlement");
    expect(result.updated).toBe(true);
    if (result.updated) {
      expect(result.transaction.status).toBe("PAID");
      expect(result.transaction.stockStatus).toBe("OUT_OF_STOCK");
      expect(result.transaction.promoCodeId).toBeDefined();
    }
  });
});
