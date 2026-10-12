import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBridgeBearer } from "@/lib/bridge/auth";
import { isBridgeIpAllowed } from "@/lib/bridge/ipAllowlist";
import { checkBridgeRateLimit } from "@/lib/bridge/rateLimit";
import {
  sendProductFoundNotification,
  sendProductStatusNotification,
} from "@/lib/whatsapp";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "bridge-webhook-request-update" });

export const dynamic = "force-dynamic";

const requestUpdateSchema = z.object({
  requestId: z.string().min(1, "requestId is required"),
  customerRef: z.string().optional().nullable(),
  status: z.enum([
    "FOUND",
    "NOT_FOUND",
    "REJECTED",
    "CONFIRMED",
    "PURCHASED",
    "EXPIRED",
    "SEARCHING",
  ]),
  query: z.string().optional().nullable(),
  categorySlug: z.string().optional().nullable(),
  foundSupplierCode: z.string().optional().nullable(),
  foundProductId: z.string().optional().nullable(),
  quotedPrice: z.number().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  // 1. Validasi IP Allowlist
  if (!isBridgeIpAllowed(request)) {
    return NextResponse.json({ error: "Forbidden: IP not allowed" }, { status: 403 });
  }

  // 2. Validasi Rate Limit
  const rateLimit = checkBridgeRateLimit(request);
  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  // 3. Validasi Autentikasi Bearer Token
  if (!verifyBridgeBearer(request)) {
    return NextResponse.json({ error: "Unauthorized: Invalid Bridge Secret Key" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = requestUpdateSchema.safeParse(body);

    if (!parsed.success) {
      log.warn("Invalid payload received from bridge request-update webhook", {
        errors: parsed.error.format(),
      });
      return NextResponse.json(
        { error: "INVALID_PAYLOAD", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      requestId,
      status,
      quotedPrice,
      foundSupplierCode,
      foundProductId,
      rejectionReason,
      transactionId,
    } = parsed.data;

    // 4. Cari record request di database Storefront
    const existing = await prisma.customerProductRequest.findFirst({
      where: {
        OR: [{ bridgeRequestId: requestId }, { id: requestId }],
      },
    });

    if (!existing) {
      log.warn("Customer product request not found for incoming webhook update", {
        requestId,
        status,
      });
      return NextResponse.json(
        { error: "REQUEST_NOT_FOUND", message: `No request matching requestId ${requestId}` },
        { status: 404 }
      );
    }

    // 5. Update data di database
    const updated = await prisma.customerProductRequest.update({
      where: { id: existing.id },
      data: {
        status,
        quotedPrice: quotedPrice ?? undefined,
        foundSupplierCode: foundSupplierCode ?? undefined,
        foundProductId: foundProductId ?? undefined,
        rejectionReason: rejectionReason ?? undefined,
        transactionId: transactionId ?? undefined,
      },
    });

    log.info("Successfully updated customer product request status", {
      id: updated.id,
      bridgeRequestId: requestId,
      status: updated.status,
      quotedPrice: updated.quotedPrice,
    });

    // 6. Forwarding Notifikasi ke Customer via WhatsApp (ST-P2a-3)
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.PUBLIC_BASE_URL ||
      "http://localhost:3000";
    const confirmationUrl = `${baseUrl.replace(/\/$/, "")}/request-confirm/${updated.id}`;

    if (status === "FOUND" && updated.quotedPrice && !updated.notifiedAt) {
      log.info("Sending product found notification to customer via WhatsApp", {
        to: updated.customerPhone,
        productName: updated.productName,
        quotedPrice: updated.quotedPrice,
      });

      await sendProductFoundNotification({
        customerPhone: updated.customerPhone,
        productName: updated.productName,
        quotedPrice: updated.quotedPrice,
        confirmationUrl,
      });

      await prisma.customerProductRequest.update({
        where: { id: updated.id },
        data: { notifiedAt: new Date() },
      });
    } else if ((status === "NOT_FOUND" || status === "REJECTED") && !updated.notifiedAt) {
      log.info("Sending product status notification (not found/rejected) to customer", {
        to: updated.customerPhone,
        status,
      });

      await sendProductStatusNotification(
        updated.customerPhone,
        updated.productName,
        status,
        rejectionReason || undefined
      );

      await prisma.customerProductRequest.update({
        where: { id: updated.id },
        data: { notifiedAt: new Date() },
      });
    }

    return NextResponse.json({
      received: true,
      id: updated.id,
      bridgeRequestId: requestId,
      status: updated.status,
    });
  } catch (error) {
    log.error("Unhandled error processing request-update webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
