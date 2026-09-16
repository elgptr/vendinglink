import { NextRequest, NextResponse } from "next/server";
import { verifyDokuNotificationSignature } from "@/lib/doku";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const clientId = request.headers.get("Client-Id") || "";
    const requestId = request.headers.get("Request-Id") || "";
    const timestamp = request.headers.get("Request-Timestamp") || "";
    const incomingSignature = request.headers.get("Signature") || "";
    const requestTarget = "/api/doku/webhook";

    const secretKey = process.env.DOKU_SECRET_KEY || "";

    // 1. Verifikasi Signature DOKU
    if (secretKey && incomingSignature) {
      const isValid = verifyDokuNotificationSignature({
        clientId,
        requestId,
        timestamp,
        requestTarget,
        rawBody,
        incomingSignature,
        secretKey,
      });

      if (!isValid) {
        console.warn(`[DOKU Webhook] Invalid signature from client: ${clientId}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const body = JSON.parse(rawBody);
    const orderId = body.order?.invoice_number;
    const transactionStatus = body.transaction?.status; // SUCCESS, FAILED, EXPIRED

    console.log(`[DOKU Webhook] Notification received for order ${orderId}: status=${transactionStatus}`);

    if (!orderId) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    // Map status DOKU ke format resolver VendingLink
    let internalStatus = "pending";
    if (transactionStatus === "SUCCESS") {
      internalStatus = "settlement";
    } else if (transactionStatus === "FAILED" || transactionStatus === "EXPIRED") {
      internalStatus = "expire";
    }

    // 2. Gunakan logic atomic stock claim yang sudah teruji
    const result = await applyMidtransStatusUpdate(orderId, internalStatus);

    return NextResponse.json({
      message: "OK",
      orderId,
      status: result.updated ? "UPDATED" : "PROCESSED",
    });
  } catch (error) {
    console.error("[DOKU Webhook] Error processing notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}