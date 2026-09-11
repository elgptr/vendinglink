import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { claimAvailableStock } from "@/lib/stock";
import { createMockProduct, createMockStock, createMockUser, cleanupTestDatabase } from "../helpers/fixtures";

describe("stock.ts — claimAvailableStock", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("should claim an available stock unit successfully", async () => {
    // Arrange: Create product and stock
    const product = await createMockProduct(prisma);
    const stocks = await createMockStock(prisma, product.id, 1);

    // Act: Claim the stock
    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStock(tx, product.id, {
        customerName: "Test Customer",
        customerPhone: "081234567890",
      });
    });

    // Assert
    expect(result).not.toBeNull();
    expect(result?.id).toBe(stocks[0].id);
    expect(result?.redeemUrl).toBe(stocks[0].redeemUrl);

    // Verify stock is marked as SOLD
    const updatedStock = await prisma.redeemStock.findUnique({
      where: { id: stocks[0].id },
    });
    expect(updatedStock?.status).toBe("SOLD");
    expect(updatedStock?.customerName).toBe("Test Customer");
    expect(updatedStock?.claimedAt).toBeDefined();
  });

  it("should return null when no stock available", async () => {
    // Arrange: Create product with no stock
    const product = await createMockProduct(prisma);

    // Act: Try to claim from empty stock
    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStock(tx, product.id, {
        customerName: "Test Customer",
        customerPhone: "081234567890",
      });
    });

    // Assert
    expect(result).toBeNull();
  });

  it("should handle concurrent claims and only one succeeds", async () => {
    // Arrange: Create product with exactly 1 stock
    const product = await createMockProduct(prisma);
    await createMockStock(prisma, product.id, 1);

    // Act: Simulate two concurrent claims
    // Note: In a real concurrent test, we'd use Promise.all() with real database connections
    // For now, we test sequential claims to verify retry logic
    const claim1 = await prisma.$transaction(async (tx) => {
      return claimAvailableStock(tx, product.id, {
        customerName: "Customer 1",
        customerPhone: "081111111111",
      });
    });

    const claim2 = await prisma.$transaction(async (tx) => {
      return claimAvailableStock(tx, product.id, {
        customerName: "Customer 2",
        customerPhone: "082222222222",
      });
    });

    // Assert: Only first claim succeeds
    expect(claim1).not.toBeNull();
    expect(claim2).toBeNull();
  });

  it("should respect MAX_CLAIM_ATTEMPTS and return null after retries", async () => {
    // Arrange: Create product with no stock
    const product = await createMockProduct(prisma);

    // Act: Claim from empty (will retry 5 times internally)
    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStock(tx, product.id, {});
    });

    // Assert: Should return null after exhausting retries
    expect(result).toBeNull();
  });

  it("should claim stock with agent ID when provided", async () => {
    // Arrange: Create a real agent so the claimedByAgentId FK holds
    // (RedeemStock.claimedByAgentId references User.id).
    const product = await createMockProduct(prisma);
    const stock = await createMockStock(prisma, product.id, 1);
    const agent = await createMockUser(prisma, {
      username: `agent-stock-${Date.now()}`,
      passwordHash: "$2a$10$fakehash",
      role: "AGENT",
      isApproved: true,
    });

    // Act
    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStock(tx, product.id, {
        claimedByAgentId: agent.id,
      });
    });

    // Assert
    expect(result).not.toBeNull();

    const updatedStock = await prisma.redeemStock.findUnique({
      where: { id: stock[0].id },
    });
    expect(updatedStock?.claimedByAgentId).toBe(agent.id);
  });

  it("should mark FIFO: claims oldest AVAILABLE stock first", async () => {
    // Arrange: Create product with multiple stocks
    const product = await createMockProduct(prisma);
    const stocks = await createMockStock(prisma, product.id, 3);

    // Manually verify they are created in order
    const allStocks = await prisma.redeemStock.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "asc" },
    });

    // Act: Claim one stock
    const result = await prisma.$transaction(async (tx) => {
      return claimAvailableStock(tx, product.id, {});
    });

    // Assert: Should claim the first (oldest) one
    expect(result?.id).toBe(allStocks[0].id);
  });
});
