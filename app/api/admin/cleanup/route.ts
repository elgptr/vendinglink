import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-cleanup" });

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function DELETE() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete all SOLD stocks and PAID/CANCELLED/EXPIRED transactions
    const [deletedStocks, deletedTransactions] = await prisma.$transaction([
      prisma.redeemStock.deleteMany({
        where: { status: "SOLD" },
      }),
      prisma.transaction.deleteMany({
        where: {
          status: { in: ["PAID", "CANCELLED", "EXPIRED"] },
        },
      }),
    ]);

    log.info("Database cleanup completed", {
      deletedStocks: deletedStocks.count,
      deletedTransactions: deletedTransactions.count,
    });

    return NextResponse.json({
      success: true,
      deletedStocks: deletedStocks.count,
      deletedTransactions: deletedTransactions.count,
    });
  } catch (error) {
    log.error("Cleanup error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
