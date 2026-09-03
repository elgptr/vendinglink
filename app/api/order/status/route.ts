import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMidtransStatus } from "@/lib/midtrans";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";

const transactionSelect = {
  agentId: true,
  orderId: true,
  status: true,
  finalAmount: true,
  originalPrice: true,
  discountAmount: true,
  customerName: true,
  productId: true,
  createdAt: true,
  paidAt: true,
  // Only exposed in the response if PAID (see safeRedeemUrl below)
  redeemUrl: true,
  product: {
    select: { name: true },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId diperlukan" }, { status: 400 });
    }

    let transaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: transactionSelect,
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Security: Only the agent who created this transaction can poll it
    if (
      transaction.agentId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ─── Fallback reconciliation ─────────────────────────────────────────
    // The HTTP notification from Midtrans may never arrive (e.g. it can't
    // reach a localhost/private dev server, or the request was dropped).
    // While the transaction is still PENDING, actively check Midtrans's own
    // GET Status API on every poll so the UI still updates correctly even
    // without a working webhook.
    if (transaction.status === "PENDING") {
      try {
        const midtransStatus = await getMidtransStatus(orderId);
        const result = await applyMidtransStatusUpdate(
          orderId,
          midtransStatus.transaction_status,
          midtransStatus.fraud_status
        );

        if (result.updated) {
          transaction = await prisma.transaction.findUnique({
            where: { orderId },
            select: transactionSelect,
          });
        }
      } catch (statusError) {
        // Midtrans returns 404 while the customer hasn't chosen/completed a
        // payment method yet — that's expected for a fresh PENDING order,
        // so just fall through and report the current (still-PENDING) status.
        console.warn(
          `[OrderStatus] Midtrans status check failed for ${orderId}:`,
          statusError instanceof Error ? statusError.message : statusError
        );
      }
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Only return redeemUrl if transaction is PAID
    const safeRedeemUrl =
      transaction.status === "PAID" ? transaction.redeemUrl : null;

    return NextResponse.json({
      orderId: transaction.orderId,
      status: transaction.status,
      finalAmount: transaction.finalAmount,
      originalPrice: transaction.originalPrice,
      discountAmount: transaction.discountAmount,
      customerName: transaction.customerName,
      productName: transaction.product.name,
      createdAt: transaction.createdAt,
      paidAt: transaction.paidAt,
      redeemUrl: safeRedeemUrl,
    });
  } catch (error) {
    console.error("Order status error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
