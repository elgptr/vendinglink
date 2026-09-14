import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  claimAvailableStock,
  claimAvailableStockBatch,
} from "@/lib/stock";
import {
  createMockProduct,
  createMockStock,
  createMockUser,
  cleanupTestDatabase,
} from "../helpers/fixtures";

describe("stock.ts — claimAvailableStockBatch", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("should claim exactly 3 available stocks when quantity=3", async () => {
    const product = await createMockProduct(prisma);
    const stocks = await createMockStock(prisma, product.id, 5);

    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStockBatch(tx, product.id, 3, {});
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);

    // Verify all 3 are marked as SOLD
    const soldStocks = await prisma.redeemStock.findMany({
      where: { productId: product.id, status: "SOLD" },
    });
    expect(soldStocks).toHaveLength(3);
  });

  it("should return null when insufficient stock for requested quantity", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 2);

    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStockBatch(tx, product.id, 5, {});
    });

    // Should return null (no partial claims)
    expect(result).toBeNull();

    // Verify no stocks were claimed
    const soldStocks = await prisma.redeemStock.findMany({
      where: { productId: product.id, status: "SOLD" },
    });
    expect(soldStocks).toHaveLength(0);
  });

  it("should respect FIFO order when claiming batch", async () => {
    const product = await createMockProduct(prisma);
    const stocks = await createMockStock(prisma, product.id, 5);

    // Get the first 3 stocks in FIFO order
    const allStocks = await prisma.redeemStock.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "asc" },
      take: 3,
    });

    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStockBatch(tx, product.id, 3, {});
    });

    // Verify claimed stocks match FIFO order
    expect(result).toHaveLength(3);
    result?.forEach((claimed, idx) => {
      expect(claimed.id).toBe(allStocks[idx].id);
    });
  });

  it("should attach agent ID when provided in batch claim", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 3);

    const agent = await createMockUser(prisma, {
      username: `agent-batch-${Date.now()}`,
      passwordHash: "$2a$10$fakehash",
      role: "AGENT",
      isApproved: true,
    });

    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStockBatch(tx, product.id, 3, {
        claimedByAgentId: agent.id,
      });
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);

    // Verify all 3 have agent ID
    const claimed = await prisma.redeemStock.findMany({
      where: {
        productId: product.id,
        claimedByAgentId: agent.id,
      },
    });

    expect(claimed).toHaveLength(3);
  });

  it("should claim with customer details (name and phone) in batch", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 2);

    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStockBatch(tx, product.id, 2, {
        customerName: "Batch Customer",
        customerPhone: "081234567890",
      });
    });

    expect(result).toHaveLength(2);

    const claimed = await prisma.redeemStock.findMany({
      where: {
        productId: product.id,
        customerName: "Batch Customer",
      },
    });

    expect(claimed).toHaveLength(2);
    claimed.forEach((stock) => {
      expect(stock.customerPhone).toBe("081234567890");
    });
  });

  it("should handle max quantity (10) successfully", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 15);

    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStockBatch(tx, product.id, 10, {});
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(10);
  });

  it("should set claimedAt timestamp on all claimed stocks", async () => {
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 2);

    const beforeClaim = new Date();

    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStockBatch(tx, product.id, 2, {});
    });

    const afterClaim = new Date();

    const claimed = await prisma.redeemStock.findMany({
      where: { productId: product.id, status: "SOLD" },
    });

    claimed.forEach((stock) => {
      expect(stock.claimedAt).toBeDefined();
      expect(new Date(stock.claimedAt!).getTime()).toBeGreaterThanOrEqual(
        beforeClaim.getTime()
      );
      expect(new Date(stock.claimedAt!).getTime()).toBeLessThanOrEqual(
        afterClaim.getTime()
      );
    });
  });
});
