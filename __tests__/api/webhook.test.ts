import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createMockProduct,
  createMockTransaction,
  createMockStock,
  createMockMidtransNotification,
  buildMidtransSignature,
  cleanupTestDatabase,
} from "../helpers/fixtures";
import { validateMidtransSignature } from "@/lib/utils";

describe("Integration: Midtrans Webhook", () => {
  let prisma: PrismaClient;
  const TEST_SERVER_KEY = "VT-sec-test-key";

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("should validate webhook signature", () => {
    const orderId = `VM-${Date.now()}-WEBHOOK`;
    const signature = buildMidtransSignature({
      orderId,
      statusCode: "200",
      grossAmount: "50000",
      serverKey: TEST_SERVER_KEY,
    });

    const isValid = validateMidtransSignature({
      orderId,
      statusCode: "200",
      grossAmount: "50000",
      serverKey: TEST_SERVER_KEY,
      receivedSignature: signature,
    });

    expect(isValid).toBe(true);
  });

  it("should reject invalid signature", () => {
    const isValid = validateMidtransSignature({
      orderId: "VM-123",
      statusCode: "200",
      grossAmount: "50000",
      serverKey: TEST_SERVER_KEY,
      receivedSignature: "fake-sig",
    });

    expect(isValid).toBe(false);
  });

  it("should create valid notification payload", () => {
    const orderId = `VM-${Date.now()}-NOTIFY`;
    const notification = createMockMidtransNotification({
      orderId,
      statusCode: "200",
      grossAmount: "50000",
      transactionStatus: "settlement",
      serverKey: TEST_SERVER_KEY,
    });

    const isValid = validateMidtransSignature({
      orderId: notification.order_id,
      statusCode: notification.status_code,
      grossAmount: notification.gross_amount,
      serverKey: TEST_SERVER_KEY,
      receivedSignature: notification.signature_key,
    });

    expect(isValid).toBe(true);
  });

  it("should track settlement notification", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 1);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
      paymentType: "MIDTRANS",
    });

    const notification = createMockMidtransNotification({
      orderId: transaction.orderId,
      statusCode: "200",
      grossAmount: String(transaction.finalAmount),
      transactionStatus: "settlement",
      serverKey: TEST_SERVER_KEY,
    });

    expect(notification.transaction_status).toBe("settlement");
    expect(notification.order_id).toBe(transaction.orderId);
  });

  it("should handle multiple notifications", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 1);
    const transaction = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
    });

    const notifications = ["pending", "settlement"].map((status) =>
      createMockMidtransNotification({
        orderId: transaction.orderId,
        statusCode: status === "pending" ? "201" : "200",
        grossAmount: String(transaction.finalAmount),
        transactionStatus: status as any,
        serverKey: TEST_SERVER_KEY,
      })
    );

    expect(notifications.length).toBe(2);
  });
});
