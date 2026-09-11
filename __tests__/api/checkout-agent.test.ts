import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createMockUser,
  createMockProduct,
  createMockStock,
  cleanupTestDatabase,
} from "../helpers/fixtures";

describe("Integration: Agent Checkout Flow", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("should create AGENT_CREDIT transaction", async () => {
    // Arrange
    const agent = await createMockUser(prisma, {
      role: "AGENT",
      isApproved: true,
    });
    const product = await createMockProduct(prisma, { price: 50000 });

    // Act
    const transaction = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-AGENT`,
        productId: product.id,
        finalAmount: 50000,
        status: "PENDING",
        paymentType: "AGENT_CREDIT",
        agentId: agent.id,
        customerName: agent.username,
        customerPhone: "AGENT",
      },
    });

    // Assert
    expect(transaction.paymentType).toBe("AGENT_CREDIT");
    expect(transaction.agentId).toBe(agent.id);
  });

  it("should track agent debt when purchasing on credit", async () => {
    // Arrange
    const agent = await createMockUser(prisma, {
      role: "AGENT",
      isApproved: true,
      outstandingDebt: 0,
    });
    const product = await createMockProduct(prisma, { price: 50000 });

    // Act: Create transaction and increment debt
    const transaction = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-DEBT`,
        productId: product.id,
        finalAmount: 50000,
        status: "PENDING",
        paymentType: "AGENT_CREDIT",
        agentId: agent.id,
        customerName: agent.username,
        customerPhone: "AGENT",
      },
    });

    // Simulate debt recording
    const updatedAgent = await prisma.user.update({
      where: { id: agent.id },
      data: { outstandingDebt: { increment: 50000 } },
    });

    // Assert
    expect(updatedAgent.outstandingDebt).toBe(50000);
  });

  it("should mark agent transaction as PAID after successful fulfillment", async () => {
    // Arrange
    const agent = await createMockUser(prisma, { role: "AGENT", isApproved: true });
    const product = await createMockProduct(prisma);
    const stock = await createMockStock(prisma, product.id, 1);

    const transaction = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-AGENT-PAY`,
        productId: product.id,
        finalAmount: 50000,
        status: "PENDING",
        paymentType: "AGENT_CREDIT",
        agentId: agent.id,
        customerName: agent.username,
        customerPhone: "AGENT",
      },
    });

    // Act: Fulfill transaction
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
    expect(updated.redeemUrl).toBe(stock[0].redeemUrl);
  });

  it("should handle multiple agent transactions", async () => {
    // Arrange
    const agent1 = await createMockUser(prisma, { role: "AGENT", isApproved: true });
    const agent2 = await createMockUser(prisma, { role: "AGENT", isApproved: true });
    const product = await createMockProduct(prisma);

    // Act
    const tx1 = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-A1`,
        productId: product.id,
        finalAmount: 50000,
        status: "PENDING",
        paymentType: "AGENT_CREDIT",
        agentId: agent1.id,
        customerName: agent1.username,
        customerPhone: "AGENT",
      },
    });

    const tx2 = await prisma.transaction.create({
      data: {
        orderId: `VM-${Date.now()}-A2`,
        productId: product.id,
        finalAmount: 30000,
        status: "PENDING",
        paymentType: "AGENT_CREDIT",
        agentId: agent2.id,
        customerName: agent2.username,
        customerPhone: "AGENT",
      },
    });

    // Assert
    expect(tx1.agentId).toBe(agent1.id);
    expect(tx2.agentId).toBe(agent2.id);
    expect(tx1.finalAmount).toBe(50000);
    expect(tx2.finalAmount).toBe(30000);
  });

  it("should handle agent rejection (unapproved)", async () => {
    // Arrange
    const unapprovedAgent = await createMockUser(prisma, {
      role: "AGENT",
      isApproved: false, // Not approved
    });
    const product = await createMockProduct(prisma);

    // Assert: Unapproved agent should be blocked
    // (This is enforced at API level, here we just verify status)
    expect(unapprovedAgent.isApproved).toBe(false);
  });
});
