import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateMidtransSignature } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: receivedSignature,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
    } = body;

    // ─── 1. Validate Midtrans Signature ───────────────────────────────────
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const isValidSignature = validateMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      serverKey,
      receivedSignature,
    });

    if (!isValidSignature) {
      console.warn(`[Webhook] Invalid signature for order ${orderId}`);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // ─── 2. Find transaction ───────────────────────────────────────────────
    const transaction = await prisma.transaction.findUnique({
      where: { orderId },
      include: { product: true },
    });

    if (!transaction) {
      console.warn(`[Webhook] Transaction not found: ${orderId}`);
      return NextResponse.json({ message: "OK" }); // Idempotent — ignore
    }

    // ─── 3. Idempotency check ─────────────────────────────────────────────
    if (transaction.status === "PAID") {
      console.log(`[Webhook] Already paid, ignoring: ${orderId}`);
      return NextResponse.json({ message: "Already processed" });
    }

    // ─── 4. Determine if payment is successful ────────────────────────────
    const isPaymentSuccess =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    const isExpired =
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire";

    if (isExpired) {
      await prisma.transaction.update({
        where: { orderId },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ message: "Transaction expired" });
    }

    if (!isPaymentSuccess) {
      return NextResponse.json({ message: "Payment not yet settled" });
    }

    // ─── 5. Anti race-condition: atomic stock claim ────────────────────────
    // Use Prisma $transaction with findFirst + update for SQLite compatibility
    // For PostgreSQL, this would use SELECT FOR UPDATE SKIP LOCKED
    const result = await prisma.$transaction(async (tx) => {
      // Find first available stock
      const stock = await tx.redeemStock.findFirst({
        where: {
          productId: transaction.productId,
          status: "AVAILABLE",
        },
        orderBy: { createdAt: "asc" },
      });

      if (!stock) {
        throw new Error("NO_STOCK_AVAILABLE");
      }

      // Mark stock as SOLD
      await tx.redeemStock.update({
        where: { id: stock.id },
        data: {
          status: "SOLD",
          claimedByAgentId: transaction.agentId,
          customerName: transaction.customerName,
          claimedAt: new Date(),
        },
      });

      // Mark transaction as PAID and store redeemUrl
      const updatedTransaction = await tx.transaction.update({
        where: { orderId },
        data: {
          status: "PAID",
          redeemUrl: stock.redeemUrl,
          paidAt: new Date(),
        },
      });

      // Increment voucher usedCount if voucher was used
      if (transaction.voucherId) {
        await tx.voucher.update({
          where: { id: transaction.voucherId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return updatedTransaction;
    });

    console.log(
      `[Webhook] Payment success for ${orderId}, redeemUrl assigned`
    );
    return NextResponse.json({ message: "OK", orderId: result.orderId });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_STOCK_AVAILABLE") {
      console.error("[Webhook] No stock available for paid transaction!");
      return NextResponse.json(
        { error: "No stock available" },
        { status: 500 }
      );
    }
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
