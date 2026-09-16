import { NextRequest, NextResponse } from "next/server";
import { verifyKaseraWebhookSignature } from "@/lib/kasera";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "kasera-webhook" });

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureV1 =
      request.headers.get("kasera-signature-v1") ||
      request.headers.get("Kasera-Signature-V1");
    const signatureLegacy =
      request.headers.get("kasera-signature") ||
      request.headers.get("Kasera-Signature");
    const eventId =
      request.headers.get("kasera-event-id") ||
      request.headers.get("Kasera-Event-Id");

    const secretKey = process.env.KASERA_WEBHOOK_SECRET;

    // 1. Verifikasi Signature Kasera
    if (secretKey && (signatureV1 || signatureLegacy)) {
      const isValid = verifyKaseraWebhookSignature({
        rawBody,
        signatureV1Header: signatureV1,
        signatureHeader: signatureLegacy,
        secretKey,
      });

      if (!isValid) {
        log.warn("Invalid Kasera webhook signature", {
          eventId,
          hasV1: !!signatureV1,
          hasLegacy: !!signatureLegacy,
        });
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
    } else if (secretKey && !signatureV1 && !signatureLegacy) {
      log.warn("Kasera webhook missing signature header", { eventId });
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const eventType = body.type || body.event;
    const orderId =
      body.data?.external_id ||
      body.external_id ||
      body.data?.merchant_ref ||
      body.merchant_ref;

    log.info("Kasera webhook received", {
      eventId: body.id || eventId,
      eventType,
      orderId,
    });

    if (!orderId) {
      return NextResponse.json(
        { error: "Invalid order data: external_id missing" },
        { status: 400 }
      );
    }

    // Map status event Kasera ke format resolver VendingLink
    let internalStatus = "pending";
    if (
      eventType === "payment.paid" ||
      body.status === "succeeded" ||
      body.data?.status === "succeeded"
    ) {
      internalStatus = "settlement";
    } else if (
      eventType === "payment.expired" ||
      body.status === "expired" ||
      body.data?.status === "expired" ||
      eventType === "payment.failed" ||
      body.status === "failed" ||
      body.data?.status === "failed"
    ) {
      internalStatus = "expire";
    }

    // 2. Gunakan atomic stock claim & settlement logic yang sudah teruji
    const result = await applyMidtransStatusUpdate(orderId, internalStatus);

    return NextResponse.json({
      message: "OK",
      orderId,
      status: result.updated ? "UPDATED" : "PROCESSED",
    });
  } catch (error) {
    log.error("Error processing Kasera webhook notification", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
