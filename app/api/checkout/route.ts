import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQrisCharge } from "@/lib/midtrans";
import { generateOrderId, sanitizeString } from "@/lib/utils";
import { z } from "zod";

const checkoutSchema = z.object({
  productId: z.string().min(1),
  voucherId: z.string().optional(),
  customerName: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, voucherId, customerName } = parsed.data;
    const sanitizedCustomerName = customerName
      ? sanitizeString(customerName)
      : undefined;

    // ─── Verify product exists and is active ──────────────────────────────
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    // ─── Check stock availability ──────────────────────────────────────────
    const availableStock = await prisma.redeemStock.count({
      where: { productId, status: "AVAILABLE" },
    });

    if (availableStock === 0) {
      return NextResponse.json(
        { error: "Stok produk habis" },
        { status: 400 }
      );
    }

    // ─── Calculate price with voucher ──────────────────────────────────────
    let discountAmount = 0;
    let resolvedVoucherId: string | undefined;

    if (voucherId) {
      const voucher = await prisma.voucher.findFirst({
        where: { id: voucherId, isActive: true },
      });

      if (voucher && voucher.usedCount < voucher.quota) {
        if (!voucher.expiresAt || new Date(voucher.expiresAt) > new Date()) {
          discountAmount = voucher.discountAmount;
          resolvedVoucherId = voucher.id;
        }
      }
    }

    const originalPrice = product.price;
    const finalAmount = Math.max(0, originalPrice - discountAmount);

    // ─── Generate order ID ─────────────────────────────────────────────────
    const orderId = generateOrderId();

    // ─── Create Midtrans QRIS charge ───────────────────────────────────────
    try {
      await createQrisCharge({
        orderId,
        amount: finalAmount,
        customerName: sanitizedCustomerName,
        productName: product.name,
      });
      // QR data is fetched separately by the client via /api/order/qr
    } catch (midtransError) {
      console.error("Midtrans charge error:", midtransError);
      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
          { error: "Gagal membuat QRIS. Periksa konfigurasi Midtrans." },
          { status: 500 }
        );
      }
      // In development, continue without Midtrans (for testing UI)
    }

    // ─── Save transaction to DB ────────────────────────────────────────────
    const transaction = await prisma.transaction.create({
      data: {
        orderId,
        productId,
        agentId: session.user.id,
        voucherId: resolvedVoucherId,
        customerName: sanitizedCustomerName,
        originalPrice,
        discountAmount,
        finalAmount,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      orderId: transaction.orderId,
      amount: finalAmount,
      originalPrice,
      discountAmount,
      productName: product.name,
      customerName: sanitizedCustomerName,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
