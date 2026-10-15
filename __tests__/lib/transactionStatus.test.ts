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

  it("keeps PENDING reservations, releases expired voucher/referral exactly once", async () => {
    const product = await createMockProduct(prisma);
    const owner = await prisma.customer.create({ data: { phone: "628991234567", referralCode: { create: { code: "EXPIRE-OWNER" } } }, include: { referralCode: true } });
    const buyer = await prisma.customer.create({ data: { phone: "628991234568" } });
    const rule = await prisma.voucherRule.create({ data: {
      code: "EXPIRE-RULE", name: "Expiring reservation", validFrom: new Date(0), value: 1000, usedCount: 2,
    } });
    const transaction = await createMockTransaction(prisma, { productId: product.id, customerId: buyer.id, status: "PENDING" });
    await prisma.voucherRedemption.create({ data: { ruleId: rule.id, customerId: buyer.id, transactionId: transaction.id } });
    await prisma.referralRedemption.create({ data: { referralCodeId: owner.referralCode!.id, refereeCustomerId: buyer.id, transactionId: transaction.id, ruleId: rule.id } });
    expect((await prisma.voucherRule.findUniqueOrThrow({ where: { id: rule.id } })).usedCount).toBe(2);
    expect((await applyMidtransStatusUpdate(transaction.orderId, "pending")).updated).toBe(false);
    expect(await prisma.voucherRedemption.count({ where: { transactionId: transaction.id } })).toBe(1);
    expect((await applyMidtransStatusUpdate(transaction.orderId, "expire")).updated).toBe(true);
    expect((await applyMidtransStatusUpdate(transaction.orderId, "expire")).updated).toBe(false);
    expect(await prisma.voucherRedemption.count({ where: { transactionId: transaction.id } })).toBe(0);
    expect(await prisma.referralRedemption.count({ where: { transactionId: transaction.id } })).toBe(0);
    expect((await prisma.voucherRule.findUniqueOrThrow({ where: { id: rule.id } })).usedCount).toBe(0);
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
      expect(result.transaction.refundPromoCodeId).toBeDefined();
    }
  });

  it("prevents double-claiming stock when concurrent settlement calls fire simultaneously", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 2);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
      paymentType: "KASERA",
      customerName: "RaceTest",
      customerPhone: "08123456789",
    });

    // Fire 2 simultaneous settlements (simulating Kasera webhook + customer polling arriving together)
    const [res1, res2] = await Promise.all([
      applyMidtransStatusUpdate(transaction.orderId, "settlement"),
      applyMidtransStatusUpdate(transaction.orderId, "settlement"),
    ]);

    // Exactly one should succeed in updating
    const updateCount = [res1.updated, res2.updated].filter(Boolean).length;
    expect(updateCount).toBe(1);

    // Exactly one stock should be claimed (status: SOLD), other must remain AVAILABLE
    const soldCount = await prisma.redeemStock.count({
      where: { productId: product.id, status: "SOLD" },
    });
    expect(soldCount).toBe(1);

    const availableCount = await prisma.redeemStock.count({
      where: { productId: product.id, status: "AVAILABLE" },
    });
    expect(availableCount).toBe(1);
  });
});
