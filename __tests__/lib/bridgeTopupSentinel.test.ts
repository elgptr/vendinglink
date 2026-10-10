import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

import { handleStockTopup } from "@/lib/bridge/topup";
import { UNMAPPED_PRODUCT_ID, UNKNOWN_PRODUCT_ID } from "@/lib/bridge/productResolver";

describe("handleStockTopup sentinel rejection", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.bridgeInboundEvent.deleteMany({
      where: { transactionId: { startsWith: "sentinel-test-" } },
    });
    await prisma.$disconnect();
  });

  it("rejects [UNMAPPED] with 400 PRODUCT_NOT_MAPPED and audits REJECTED", async () => {
    const txId = `sentinel-test-unmapped-${Date.now()}`;
    const result = await handleStockTopup({
      transaction_id: txId,
      product_id: UNMAPPED_PRODUCT_ID,
      supplier_code: "RZK",
      supplier_product_id: "supplier-123",
      added_qty: 1,
      items: ["https://example.com/key"],
      source: "BRIDGE_BOT",
    });

    expect(result.status).toBe(400);
    expect(result.code).toBe("PRODUCT_NOT_MAPPED");
    expect(result.message).toContain("/map");

    const event = await prisma.bridgeInboundEvent.findUnique({
      where: { transactionId: txId },
    });
    expect(event?.status).toBe("REJECTED");
    expect(event?.error).toContain(UNMAPPED_PRODUCT_ID);
  });

  it("rejects [UNKNOWN] with 400 PRODUCT_ID_SENTINEL_UNKNOWN and audits REJECTED", async () => {
    const txId = `sentinel-test-unknown-${Date.now()}`;
    const result = await handleStockTopup({
      transaction_id: txId,
      product_id: UNKNOWN_PRODUCT_ID,
      supplier_code: "RZK",
      supplier_product_id: "supplier-456",
      added_qty: 1,
      items: ["https://example.com/key"],
      source: "BRIDGE_BOT",
    });

    expect(result.status).toBe(400);
    expect(result.code).toBe("PRODUCT_ID_SENTINEL_UNKNOWN");
    expect(result.message).toContain(UNKNOWN_PRODUCT_ID);

    const event = await prisma.bridgeInboundEvent.findUnique({
      where: { transactionId: txId },
    });
    expect(event?.status).toBe("REJECTED");
    expect(event?.error).toContain(UNKNOWN_PRODUCT_ID);
  });

  it("does not auto-create a product for sentinel product_id", async () => {
    const txId = `sentinel-test-nocreate-${Date.now()}`;
    const before = await prisma.product.count();

    await handleStockTopup({
      transaction_id: txId,
      product_id: UNMAPPED_PRODUCT_ID,
      supplier_code: "RZK",
      supplier_product_id: "supplier-nocreate",
      added_qty: 1,
      items: ["https://example.com/key"],
      source: "BRIDGE_BOT",
    });

    const after = await prisma.product.count();
    expect(after).toBe(before);
  });
});
