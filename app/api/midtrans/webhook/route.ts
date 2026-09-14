import { NextRequest, NextResponse } from "next/server";
import { validateMidtransSignature } from "@/lib/utils";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "midtrans-webhook" });

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

    log.info("Webhook notification received", { orderId, transactionStatus, fraudStatus });

    // --- 1. Validate Midtrans Signature ---
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const isValidSignature = validateMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      serverKey,
      receivedSignature,
    });

    if (!isValidSignature) {
      log.warn("Invalid signature", { orderId });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // --- 2. Apply the status update (shared with /api/order/status fallback) ---
    const result = await applyMidtransStatusUpdate(
      orderId,
      transactionStatus,
      fraudStatus
    );

    if (!result.updated) {
      switch (result.reason) {
        case "NOT_FOUND":
          log.warn("Transaction not found", { orderId });
          return NextResponse.json({ message: "OK" }); // Idempotent - ignore
        case "ALREADY_PROCESSED":
          log.info("Already processed, ignoring", { orderId });
          return NextResponse.json({ message: "Already processed" });
        case "NOT_YET_SETTLED":
          return NextResponse.json({ message: "Payment not yet settled" });
      }
    }

    if (result.transaction.status === "EXPIRED") {
      return NextResponse.json({ message: "Transaction expired" });
    }

    log.info("Payment success, redeemUrl assigned", { orderId });
    return NextResponse.json({
      message: "OK",
      orderId: result.transaction.orderId,
    });
  } catch (error) {
    log.error("Webhook error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
