import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMidtransStatus } from "@/lib/midtrans";
import midtransClient from "midtrans-client";

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
      select: { agentId: true, status: true, finalAmount: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (
      transaction.agentId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If already paid/expired, no need for QR
    if (transaction.status !== "PENDING") {
      return NextResponse.json({ qrString: "", qrCodeUrl: "" });
    }

    // Try to get QR from Midtrans
    try {
      const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
      const coreApi = new midtransClient.CoreApi({
        isProduction,
        serverKey: process.env.MIDTRANS_SERVER_KEY!,
        clientKey: process.env.MIDTRANS_CLIENT_KEY!,
      });

      // Get transaction status which also contains QR info for QRIS
      const midtransData = await coreApi.transaction.status(orderId);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = midtransData as any;
      const qrString = data?.qr_string || "";
      const generateAction = (data?.actions || []).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any) => a.name === "generate-qr-code"
      );

      return NextResponse.json({
        qrString,
        qrCodeUrl: generateAction?.url || "",
      });
    } catch {
      // Midtrans not configured or sandbox — return empty
      return NextResponse.json({ qrString: "", qrCodeUrl: "" });
    }
  } catch (error) {
    console.error("QR endpoint error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
