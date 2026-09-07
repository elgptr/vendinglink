import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public — no auth required. Restricted to paymentType === "MIDTRANS" so an
// agent's credit-based order token (there isn't one, but as defense-in-depth)
// can never be fetched through this endpoint.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId diperlukan" }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: {
        paymentType: true,
        status: true,
        snapToken: true,
      },
    });

    if (!transaction || transaction.paymentType !== "MIDTRANS") {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    // If already paid/expired, no need for the Snap token anymore
    if (transaction.status !== "PENDING") {
      return NextResponse.json({ snapToken: "" });
    }

    return NextResponse.json({
      snapToken: transaction.snapToken || "",
    });
  } catch (error) {
    console.error("Customer snap token endpoint error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
