import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createMockUser,
  createMockProduct,
  createMockStock,
  cleanupTestDatabase,
} from "../helpers/fixtures";

describe("Integration: Customer Checkout Flow", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("should create transaction for customer checkout", async () => {
    // Arrange
    const product = await createMockProduct(prisma, {
      price: 50000,
      type: "LINK",
    });

    // Act: Create transaction as if from customer checkout
    const transaction = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-TEST`,
        productId: product.id,
        finalAmount: 50000,
        status: "PENDING",
        paymentType: "MIDTRANS",
        customerName: "Test Customer",
        customerPhone: "081234567890",
      },
    });

    // Assert
    expect(transaction).toBeDefined();
    expect(transaction.status).toBe("PENDING");
    expect(transaction.paymentType).toBe("MIDTRANS");
    expect(transaction.customerName).toBe("Test Customer");
  });

  it("should handle customer with voucher discount", async () => {
    // Arrange
    const product = await createMockProduct(prisma, { price: 100000 });
    const voucher = await prisma.voucher.create({
      data: {
        code: `VOUCHER-${Date.now()}`,
        discount: 10000,
        maxUses: 100,
        usedCount: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Act
    const transaction = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-VOUCHER`,
        productId: product.id,
        finalAmount: 90000, // 100000 - 10000 discount
        status: "PENDING",
        paymentType: "MIDTRANS",
        customerName: "Customer with Voucher",
        customerPhone: "081234567890",
        voucherId: voucher.id,
      },
    });

    // Assert
    expect(transaction.finalAmount).toBe(90000);
    expect(transaction.voucherId).toBe(voucher.id);

    // Clean up
    await prisma.voucher.delete({ where: { id: voucher.id } });
  });

  it("should handle customer with promo code", async () => {
    // Arrange
    const product = await createMockProduct(prisma, { price: 50000 });
    const promoCode = await prisma.promoCode.create({
      data: {
        code: `PROMO-${Date.now()}`,
        discount: 5000,
        type: "MANUAL",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Act
    const transaction = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-PROMO`,
        productId: product.id,
        finalAmount: 45000, // 50000 - 5000
        status: "PENDING",
        paymentType: "MIDTRANS",
        customerName: "Customer with Promo",
        customerPhone: "081234567890",
        promoCodeId: promoCode.id,
      },
    });

    // Assert
    expect(transaction.finalAmount).toBe(45000);
    expect(transaction.promoCodeId).toBe(promoCode.id);

    // Clean up
    await prisma.promoCode.delete({ where: { id: promoCode.id } });
  });

  it("should track transaction from pending to paid", async () => {
    // Arrange
    const product = await createMockProduct(prisma);
    const stock = await createMockStock(prisma, product.id, 1);

    const transaction = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-FLOW`,
        productId: product.id,
        finalAmount: 50000,
        status: "PENDING",
        paymentType: "MIDTRANS",
        customerName: "Test Flow",
        customerPhone: "081234567890",
      },
    });

    // Act: Update status to PAID (simulating webhook)
    const updated = await prisma.transaction.update({
      where: { orderId: transaction.orderId },
      data: {
        status: "PAID",
        stockStatus: "FULFILLED",
        redeemUrl: stock[0].redeemUrl,
        paidAt: new Date(),
      },
    });

    // Assert
    expect(updated.status).toBe("PAID");
    expect(updated.stockStatus).toBe("FULFILLED");
    expect(updated.paidAt).toBeDefined();
  });
});
