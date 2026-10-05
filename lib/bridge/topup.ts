import { prisma } from "@/lib/prisma";
import { resolveBridgeProduct } from "./productResolver";
import { stockTopupSchema } from "./schema";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "bridge-topup" });

export async function handleStockTopup(data: z.infer<typeof stockTopupSchema>) {
  const {
    transaction_id,
    product_id,
    supplier_code,
    supplier_product_id,
    added_qty,
    items,
    source,
  } = data;

  // 1. Idempotency Check & Event Creation
  // Check if event already exists
  const existingEvent = await prisma.bridgeInboundEvent.findUnique({
    where: { transactionId: transaction_id },
  });

  if (existingEvent) {
    if (existingEvent.status === "COMPLETED") {
      return { status: 409, message: "Transaction already completed", existingEvent };
    }
    if (existingEvent.status === "PROCESSING") {
      return { status: 409, message: "Transaction is already processing", existingEvent };
    }
    // If REJECTED, we will re-process it (could be manual retry). Let's update it to PROCESSING.
    await prisma.bridgeInboundEvent.update({
      where: { id: existingEvent.id },
      data: { status: "PROCESSING", error: null },
    });
  }

  const event = existingEvent || await prisma.bridgeInboundEvent.create({
    data: {
      transactionId: transaction_id,
      source: source,
      supplierCode: supplier_code,
      supplierProductId: supplier_product_id,
      externalProductId: product_id,
      addedQty: added_qty,
      status: "PROCESSING",
    },
  });

  try {
    // 2. Resolve Product
    const product = await resolveBridgeProduct(
      product_id,
      supplier_code,
      supplier_product_id
    );

    if (product.supplierMode === "REZEKI") {
      // User says: Reject the request with a 400 error, forcing the Bridge to mark it as NEEDS_REVIEW
      await prisma.bridgeInboundEvent.update({
        where: { id: event.id },
        data: { status: "REJECTED", error: "Product is in REZEKI mode, cannot accept manual keys." },
      });
      return { status: 400, message: "Product is in REZEKI mode, cannot accept manual keys. Needs review." };
    }

    await prisma.bridgeInboundEvent.update({
      where: { id: event.id },
      data: { productId: product.id },
    });

    // 3. Dedupe items
    const existingStocks = await prisma.redeemStock.findMany({
      where: {
        productId: product.id,
        redeemUrl: { in: items },
      },
      select: { redeemUrl: true },
    });

    const existingKeys = new Set(existingStocks.map((s) => s.redeemUrl));
    const newItems = items.filter((item) => !existingKeys.has(item));

    if (newItems.length === 0) {
      await prisma.bridgeInboundEvent.update({
        where: { id: event.id },
        data: {
          status: "COMPLETED",
          insertedQty: 0,
          skippedQty: items.length,
          error: "All items already exist",
        },
      });
      return { status: 201, message: "All items already exist", inserted: 0, skipped: items.length };
    }

    // 4. Insert new items
    const result = await prisma.$transaction(async (tx) => {
      await tx.redeemStock.createMany({
        data: newItems.map((item) => ({
          productId: product.id,
          redeemUrl: item,
          source: "BRIDGE",
          bridgeTxId: transaction_id,
          status: "AVAILABLE",
        })),
      });

      return await tx.bridgeInboundEvent.update({
        where: { id: event.id },
        data: {
          status: "COMPLETED",
          insertedQty: newItems.length,
          skippedQty: items.length - newItems.length,
        },
      });
    });

    log.info("Bridge top-up completed", {
      transactionId: transaction_id,
      inserted: result.insertedQty,
      skipped: result.skippedQty,
    });

    return {
      status: 201,
      message: "Top-up successful",
      transaction_id: transaction_id,
      product_id: product.id,
      inserted: result.insertedQty,
      skipped: result.skippedQty,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    await prisma.bridgeInboundEvent.update({
      where: { id: event.id },
      data: { status: "REJECTED", error: errMsg },
    });
    log.error("Bridge top-up failed", { error: errMsg, transactionId: transaction_id });
    return { status: 500, message: "Internal server error" };
  }
}
