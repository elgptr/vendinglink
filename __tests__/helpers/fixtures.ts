import crypto from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { TestProduct, TestRedeemStock, TestUser } from "./types";

/**
 * Factory functions for creating test data
 * These are used across all unit and integration tests
 */

/**
 * Create a mock user for testing
 */
export async function createMockUser(
  prisma: PrismaClient,
  overrides?: Partial<Prisma.UserCreateInput>
): Promise<TestUser> {
  const user = await prisma.user.create({
    data: {
      username: `testuser-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      passwordHash: "$2a$10$fakehash", // bcrypt-like placeholder
      role: overrides?.role || "AGENT",
      isApproved: overrides?.isApproved ?? true,
      isActive: overrides?.isActive ?? true,
      outstandingDebt: overrides?.outstandingDebt ?? 0,
      ...overrides,
    },
  });

  return user as unknown as TestUser;
}

/**
 * Create a mock product for testing
 */
export async function createMockProduct(
  prisma: PrismaClient,
  overrides?: Partial<Prisma.ProductCreateInput>
): Promise<TestProduct> {
  const product = await prisma.product.create({
    data: {
      name: `Test Product ${Date.now()}`,
      price: overrides?.price ?? 50000,
      type: overrides?.type ?? "LINK",
      description: overrides?.description || "Test product",
      isActive: overrides?.isActive ?? true,
      ...overrides,
    },
  });

  return product as unknown as TestProduct;
}

/**
 * Create mock redeem stock entries for a product
 * Creates `count` number of AVAILABLE stock items
 * Uses UncheckedInput so scalar `productId` can be passed directly
 */
export async function createMockStock(
  prisma: PrismaClient,
  productId: string,
  count: number,
  overrides?: Partial<Prisma.RedeemStockUncheckedCreateInput>
): Promise<TestRedeemStock[]> {
  const stocks: TestRedeemStock[] = [];

  for (let i = 0; i < count; i++) {
    const stock = await prisma.redeemStock.create({
      data: {
        productId,
        redeemUrl: `https://example.com/redeem/${crypto.randomBytes(8).toString("hex")}`,
        status: "AVAILABLE",
        ...overrides,
      },
    });
    stocks.push(stock as unknown as TestRedeemStock);
  }

  return stocks;
}

/**
 * Create a mock transaction for testing
 * Uses UncheckedInput so scalar fields (productId, agentId, etc.) can be passed directly
 */
export async function createMockTransaction(
  prisma: PrismaClient,
  overrides?: Partial<Prisma.TransactionUncheckedCreateInput>
): Promise<any> {
  const orderId = overrides?.orderId ?? `VM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Ensure productId exists or create one
  let productId = overrides?.productId;
  if (!productId) {
    const product = await prisma.product.create({
      data: {
        name: `Auto Product for Transaction`,
        price: overrides?.finalAmount ?? 50000,
        type: "LINK",
      },
    });
    productId = product.id;
  }

  const transaction = await prisma.transaction.create({
    data: {
      orderId,
      productId,
      originalPrice: overrides?.originalPrice ?? overrides?.finalAmount ?? 50000,
      finalAmount: overrides?.finalAmount ?? 50000,
      status: overrides?.status ?? "PENDING",
      paymentType: overrides?.paymentType ?? "MIDTRANS",
      customerName: overrides?.customerName ?? "Test Customer",
      customerPhone: overrides?.customerPhone ?? "081234567890",
      agentId: overrides?.agentId,
      voucherId: overrides?.voucherId,
      promoCodeId: overrides?.promoCodeId,
      discountAmount: overrides?.discountAmount,
      stockStatus: overrides?.stockStatus,
      redeemUrl: overrides?.redeemUrl,
      qrString: overrides?.qrString,
      qrCodeUrl: overrides?.qrCodeUrl,
      snapToken: overrides?.snapToken,
      paidAt: overrides?.paidAt,
      isSettled: overrides?.isSettled,
    },
  });

  return transaction;
}

/**
 * Build a valid Midtrans webhook signature
 * SHA512(order_id + status_code + gross_amount + server_key)
 */
export function buildMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
}): string {
  const { orderId, statusCode, grossAmount, serverKey } = params;
  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;

  return crypto.createHash("sha512").update(rawString).digest("hex");
}

/**
 * Create a mock Midtrans notification payload
 */
export function createMockMidtransNotification(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  transactionStatus: "settlement" | "pending" | "expire" | "cancel";
  fraudStatus?: "accept" | "deny" | "challenge";
  serverKey: string;
}): Record<string, any> {
  const { orderId, statusCode, grossAmount, transactionStatus, fraudStatus, serverKey } = params;

  const signature = buildMidtransSignature({ orderId, statusCode, grossAmount, serverKey });

  return {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    transaction_status: transactionStatus,
    fraud_status: fraudStatus || "accept",
    signature_key: signature,
    payment_type: "credit_card",
    transaction_id: `MIDTRANS-${Date.now()}`,
    transaction_time: new Date().toISOString(),
  };
}

/**
 * Seed database with minimal test data
 * Useful for integration tests
 */
export async function seedTestDatabase(prisma: PrismaClient): Promise<{
  admin: TestUser;
  agent: TestUser;
  product: TestProduct;
  stock: TestRedeemStock[];
}> {
  // Create admin user
  const admin = await createMockUser(prisma, {
    username: "test-admin",
    role: "ADMIN",
    isApproved: true,
  });

  // Create approved agent
  const agent = await createMockUser(prisma, {
    username: "test-agent",
    role: "AGENT",
    isApproved: true,
  });

  // Create product with stock
  const product = await createMockProduct(prisma, {
    name: "Test Product",
    price: 50000,
  });

  const stock = await createMockStock(prisma, product.id, 5);

  return { admin, agent, product, stock };
}

/**
 * Clean up test database
 * Deletes all test data (use with caution!)
 */
export async function cleanupTestDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in order of dependencies.
  // Wrapped in individual try/catch so a foreign-key conflict in one step
  // (e.g. from a parallel suite already having cleaned up) doesn't prevent
  // the rest from running.
  const deletions = [
    () => prisma.transaction.deleteMany({}),
    () => prisma.voucher.deleteMany({}),
    () => prisma.promoCode.deleteMany({}),
    () => prisma.redeemStock.deleteMany({}),
    () => prisma.product.deleteMany({}),
    () => prisma.user.deleteMany({}),
  ];

  for (const del of deletions) {
    try {
      await del();
    } catch {
      // Another suite may have already removed the rows; continue cleanup.
    }
  }
}
