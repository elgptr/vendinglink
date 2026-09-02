import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const transaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        status: true,
        finalAmount: true,
        originalPrice: true,
        discountAmount: true,
        customerName: true,
        productId: true,
        createdAt: true,
        paidAt: true,
        // Only expose redeemUrl if PAID
        redeemUrl: true,
        product: {
          select: { name: true },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Security: Only the agent who created this transaction can poll it
    const fullTransaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: { agentId: true },
    });

    if (
      fullTransaction?.agentId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
