import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/whatsapp";
import { createBridgeProductRequest } from "@/lib/bridge/requestsClient";
import { createLogger } from "@/lib/logger";

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

    // Generate opaque customerRef
    const customerRef = `cust_${crypto
      .createHash("sha256")
      .update(normalizedPhone)
      .digest("hex")
      .slice(0, 16)}`;

    // 1. Simpan ke database Storefront terlebih dahulu
    const localRequest = await prisma.customerProductRequest.create({
      data: {
        customerPhone: normalizedPhone,
        customerRef,
        productId: productId || undefined,
        productName,
        categorySlug: categorySlug || undefined,
        maxBudget: maxBudget || undefined,
        status: "SEARCHING",
      },
    });

    log.info("Created local CustomerProductRequest", {
      id: localRequest.id,
      customerRef,
      productName,
    });

    // 2. Kirim permintaan pencarian ke Bridge
    const bridgeResult = await createBridgeProductRequest({
      customerRef,
      query: productName,
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
        status: "SEARCHING",
        message: "Permintaan Anda telah tersimpan dan akan diproses segera.",
      },
      { status: 202 }
    );
  } catch (error) {
    log.error("Failed to process customer product request", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat memproses permintaan." },
      { status: 500 }
    );
  }
}
