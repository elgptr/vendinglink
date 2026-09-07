import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
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
        agentId: true,
        status: true,
        finalAmount: true,
        snapToken: true,
      },
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

    // If already paid/expired, no need for the Snap token anymore
    if (transaction.status !== "PENDING") {
      return NextResponse.json({ snapToken: "" });
    }

    return NextResponse.json({
      snapToken: transaction.snapToken || "",
    });
  } catch (error) {
    console.error("Snap token endpoint error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

