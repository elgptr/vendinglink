import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone || phone.trim() === "") {
      return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
    }

    // Sanitize the phone number: remove non-digit characters
    const sanitizedPhone = phone.replace(/\D/g, "");

    const orders = await prisma.transaction.findMany({
      where: {
        customerPhone: { contains: sanitizedPhone },
        status: "PAID",
      },
      include: {
        product: { select: { name: true, type: true, guideImageUrl: true, guideText: true } }
      },
      orderBy: { paidAt: "desc" },
      take: 20
    });

    const formattedOrders = orders.map(order => ({
      orderId: order.orderId,
      productName: order.product.name,
      productType: order.product.type,
      redeemUrl: order.redeemUrl,
      guideImageUrl: order.product.guideImageUrl,
      guideText: order.product.guideText,
      finalAmount: order.finalAmount,
      paidAt: order.paidAt,
      stockStatus: order.stockStatus,
      promoCodeId: order.promoCodeId
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error("Order lookup API error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
