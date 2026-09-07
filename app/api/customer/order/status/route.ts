import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMidtransStatus } from "@/lib/midtrans";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";

// Public order status polling — no auth required. Only reachable with the
// unguessable orderId (VM-<timestamp>-<random>), and restricted to
// paymentType === "MIDTRANS" (agentId null) transactions so an agent's
// credit-based order can never be looked up through this endpoint.
export const dynamic = "force-dynamic";

const transactionSelect = {
  orderId: true,
  status: true,
  paymentType: true,
  finalAmount: true,
  originalPrice: true,
  discountAmount: true,
  customerName: true,
  createdAt: true,
  paidAt: true,
  // Only exposed in the response if PAID (see safeRedeemUrl below)
  redeemUrl: true,
  product: {
    select: { name: true, guideImageUrl: true },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId diperlukan" }, { status: 400 });
    }

    let transaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: transactionSelect,
    });

    if (!transaction || transaction.paymentType !== "MIDTRANS") {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // ─── Fallback reconciliation ─────────────────────────────────────────
    // Mirrors /api/order/status: actively check Midtrans's GET Status API
    // while PENDING, in case the webhook notification never arrives.
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
        console.warn(
          `[CustomerOrderStatus] Midtrans status check failed for ${orderId}:`,
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

    // Only return redeemUrl/guideImageUrl if transaction is PAID
    const isPaid = transaction.status === "PAID";

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
      redeemUrl: isPaid ? transaction.redeemUrl : null,
      guideImageUrl: isPaid ? transaction.product.guideImageUrl : null,
    });
  } catch (error) {
    console.error("Customer order status error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
