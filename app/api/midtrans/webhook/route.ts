import { NextRequest, NextResponse } from "next/server";
import { validateMidtransSignature } from "@/lib/utils";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";

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

    console.log(
      `[Webhook] Notification received for ${orderId}: transaction_status=${transactionStatus}, fraud_status=${fraudStatus}`
    );

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

    // ─── 2. Apply the status update (shared with /api/order/status fallback) ──
    const result = await applyMidtransStatusUpdate(
      orderId,
      transactionStatus,
      fraudStatus
    );

    if (!result.updated) {
      switch (result.reason) {
        case "NOT_FOUND":
          console.warn(`[Webhook] Transaction not found: ${orderId}`);
          return NextResponse.json({ message: "OK" }); // Idempotent — ignore
        case "ALREADY_PROCESSED":
          console.log(`[Webhook] Already processed, ignoring: ${orderId}`);
          return NextResponse.json({ message: "Already processed" });
        case "NOT_YET_SETTLED":
          return NextResponse.json({ message: "Payment not yet settled" });
      }
    }

    if (result.transaction.status === "EXPIRED") {
      return NextResponse.json({ message: "Transaction expired" });
    }

    console.log(
      `[Webhook] Payment success for ${orderId}, redeemUrl assigned`
    );
    return NextResponse.json({
      message: "OK",
      orderId: result.transaction.orderId,
    });
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
