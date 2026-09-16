import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const stock = await prisma.redeemStock.findUnique({
      where: { id },
      select: { id: true, redeemUrl: true },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stok tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ id: stock.id, redeemUrl: stock.redeemUrl });
  } catch (error) {
    console.error("Stock reveal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}