import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  normalizePhone,
  sendAdminPreOrderReceivedAlert,
  sendCustomerPreOrderTrackingNotification,
} from "@/lib/whatsapp";
import { createBridgeProductRequest } from "@/lib/bridge/requestsClient";
import { createLogger } from "@/lib/logger";
import {
  assertNoExistingActiveRequest,
  assertProductNeedsPreOrder,
} from "@/lib/guards/preorderGuard";
import { auditTrackingLinkCreated } from "@/lib/audit/trackingAudit";

const log = createLogger({ module: "customer-product-requests" });

export const dynamic = "force-dynamic";

const submitRequestSchema = z.object({
  customerPhone: z.string().min(8, "Nomor WhatsApp tidak valid"),
  productName: z.string().min(2, "Nama produk minimal 2 karakter"),
  productId: z.string().optional().nullable(),
  categorySlug: z.string().optional().nullable(),
  maxBudget: z.number().positive().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submitRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { customerPhone, productName, productId, categorySlug, maxBudget } = parsed.data;
    const normalizedPhone = normalizePhone(customerPhone);

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Format nomor WhatsApp tidak valid. Gunakan format 08... atau 628..." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.PUBLIC_BASE_URL ||
      "http://localhost:3000";

    // ── Guard 1: Cek apakah user sudah memiliki permintaan pre-order aktif (max 1) ─
    const activeCheck = await assertNoExistingActiveRequest(normalizedPhone);
    if (!activeCheck.allowed && activeCheck.activeRequest) {
      const activeToken = activeCheck.activeRequest.trackingToken || activeCheck.activeRequest.id;
      const activeTrackingUrl = `${baseUrl.replace(/\/$/, "")}/pre-order/track/${activeToken}`;
      return NextResponse.json(
        {
          error: "ACTIVE_REQUEST_EXISTS",
          message: activeCheck.reason,
          activeRequest: activeCheck.activeRequest,
          trackingUrl: activeTrackingUrl,
        },
        { status: 409 }
      );
    }

    // ── Guard 2: Cek apakah stok riil produk saat ini sudah tersedia di etalase ──
    const stockCheck = await assertProductNeedsPreOrder(productId);
    if (!stockCheck.allowed) {
      return NextResponse.json(
        {
          error: "ALREADY_IN_STOCK",
          message: stockCheck.reason,
          checkoutUrl: `/customer/checkout/${productId}`,
          stockCount: stockCheck.stockCount,
        },
        { status: 400 }
      );
    }

    // Generate opaque customerRef
    const customerRef = `cust_${crypto
      .createHash("sha256")
      .update(normalizedPhone)
      .digest("hex")
      .slice(0, 16)}`;

    // Generate unique tracking token and 24-hour expiration
    const trackingToken = `trk_${crypto.randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

    // 1. Simpan ke database Storefront terlebih dahulu
    const localRequest = await prisma.customerProductRequest.create({
      data: {
        trackingToken,
        customerPhone: normalizedPhone,
        customerRef,
        productId: productId || undefined,
        productName,
        categorySlug: categorySlug || undefined,
        maxBudget: maxBudget || undefined,
        status: "SEARCHING",
        expiresAt,
        paymentType: "PAY_ON_CONFIRM",
        paymentStatus: "UNPAID",
      },
    });

    log.info("Created local CustomerProductRequest", {
      id: localRequest.id,
      trackingToken,
      customerRef,
      productName,
    });

    // Catat log audit pembuatan link tracking
    auditTrackingLinkCreated({
      trackingToken,
      requestId: localRequest.id,
      customerPhone: normalizedPhone,
      productName,
      expiresAt: expiresAt.toISOString(),
      clientIp,
    });

    const trackingUrl = `${baseUrl.replace(/\/$/, "")}/pre-order/track/${trackingToken}`;

    // Kirim notifikasi SaungWA ke Customer berisi Link Tracking
    sendCustomerPreOrderTrackingNotification({
      customerPhone: normalizedPhone,
      productName,
      maxBudget,
      trackingUrl,
    }).catch((err) => {
      log.warn("Failed to dispatch customer pre-order tracking alert via SaungWA", { error: err?.message });
    });

    // Notify Admin via SaungWA that a pre-order has been placed
    sendAdminPreOrderReceivedAlert({
      productName,
      customerPhone: normalizedPhone,
      maxBudget,
      requestId: localRequest.id,
    }).catch((err) => {
      log.warn("Failed to dispatch admin pre-order alert via SaungWA", { error: err?.message });
    });

    // 2. Kirim permintaan pencarian ke Bridge
    const bridgeResult = await createBridgeProductRequest({
      customerRef,
      query: productName,
      productId: productId || undefined,
      categorySlug: categorySlug || undefined,
      maxBudget: maxBudget || undefined,
    });

    if (bridgeResult.success && bridgeResult.requestId) {
      // Hubungkan bridgeRequestId ke record lokal
      await prisma.customerProductRequest.update({
        where: { id: localRequest.id },
        data: {
          bridgeRequestId: bridgeResult.requestId,
          status: bridgeResult.status || "SEARCHING",
        },
      });

      return NextResponse.json(
        {
          success: true,
          id: localRequest.id,
          trackingToken,
          trackingUrl,
          bridgeRequestId: bridgeResult.requestId,
          status: "SEARCHING",
          message: "Permintaan produk berhasil dikirim dan sedang dicari oleh sistem.",
        },
        { status: 202 }
      );
    }

    // Jika Bridge menolak atau gagal merespons, tetap catat status lokal
    log.warn("Bridge dispatch failed, keeping request in local queue", {
      id: localRequest.id,
      error: bridgeResult.error,
    });

    return NextResponse.json(
      {
        success: true,
        id: localRequest.id,
        trackingToken,
        trackingUrl,
        status: "SEARCHING",
        message: "Permintaan Anda telah tersimpan dan akan diproses segera.",
      },
      { status: 202 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Failed to process customer product request", {
      error: errorMessage,
    });
    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal saat memproses permintaan.",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

