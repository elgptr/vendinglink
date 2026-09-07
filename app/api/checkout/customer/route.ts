import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSnapTransaction } from "@/lib/midtrans";
import { generateOrderId, sanitizeString } from "@/lib/utils";
import { z } from "zod";

const customerCheckoutSchema = z.object({
  productId: z.string().min(1),
  voucherId: z.string().optional(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = customerCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, voucherId, customerName, customerPhone } = parsed.data;
    const sanitizedCustomerName = sanitizeString(customerName);
    const sanitizedCustomerPhone = customerPhone ? sanitizeString(customerPhone) : undefined;

    if (!sanitizedCustomerName) {
      return NextResponse.json(
        { error: "Nama pembeli wajib diisi" },
        { status: 400 }
      );
    }

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

    // ─── Create Midtrans Snap transaction ──────────────────────────────────
    let snapToken: string | undefined;

    try {
      const snapResponse = await createSnapTransaction({
        orderId,
        amount: finalAmount,
        customerName: sanitizedCustomerName,
        customerPhone: sanitizedCustomerPhone,
        productName: product.name,
      });

      snapToken = snapResponse.token;
    } catch (midtransError) {
      console.error("Midtrans charge error:", midtransError);

      const httpStatus = (midtransError as { httpStatusCode?: string }).httpStatusCode;
      if (httpStatus === "402") {
        return NextResponse.json(
          { error: "Metode pembayaran belum diaktifkan di akun Midtrans." },
          { status: 502 }
        );
      }
      if (httpStatus === "401") {
        return NextResponse.json(
          { error: "Konfigurasi Midtrans tidak valid. Periksa SERVER_KEY di .env." },
          { status: 502 }
        );
      }

      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
          { error: "Gagal membuat transaksi pembayaran." },
          { status: 500 }
        );
      }
    }

    // ─── Save transaction to DB ────────────────────────────────────────────
    const transaction = await prisma.transaction.create({
      data: {
        orderId,
        productId,
        agentId: null, // Public B2C transaction has no agent
        voucherId: resolvedVoucherId,
        customerName: sanitizedCustomerName,
        customerPhone: sanitizedCustomerPhone,
        paymentType: "MIDTRANS",
        originalPrice,
        discountAmount,
        finalAmount,
        status: "PENDING",
        snapToken,
      },
    });

    return NextResponse.json({
      orderId: transaction.orderId,
      amount: finalAmount,
      originalPrice,
      discountAmount,
      productName: product.name,
      customerName: sanitizedCustomerName,
      snapToken: transaction.snapToken,
    });
  } catch (error) {
    console.error("Customer checkout error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
