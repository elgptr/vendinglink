import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportToCsv } from "@/lib/utils";
import { createLogger } from "@/lib/logger";
import { uploadCsvToDrive } from "@/lib/gdrive";

const log = createLogger({ module: "admin-reports" });

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const agentId = searchParams.get("agentId");
    const exportCsv = searchParams.get("export") === "csv";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build filter
    const where: {
      status: string;
      agentId?: string;
      paidAt?: { gte?: Date; lte?: Date };
    } = {
      status: "PAID",
    };

    if (agentId) where.agentId = agentId;
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paidAt.lte = end;
      }
    }

    // ─── Metrics ──────────────────────────────────────────────────────────
    const [totalGross, totalNet, totalSold, agents] = await Promise.all([
      prisma.transaction.aggregate({
        where,
        _sum: { originalPrice: true },
      }),
      prisma.transaction.aggregate({
        where,
        _sum: { finalAmount: true },
      }),
      prisma.transaction.count({ where }),
      prisma.user.findMany({
        where: { role: "AGENT" },
        select: { id: true, username: true },
        orderBy: { username: "asc" },
      }),
    ]);

    // ─── Paginated transactions ────────────────────────────────────────────
    const skip = (page - 1) * limit;

    if (exportCsv) {
      // Fetch ALL transactions for export (no pagination)
      const allTransactions = await prisma.transaction.findMany({
        where,
        orderBy: { paidAt: "desc" },
        include: {
          agent: { select: { username: true } },
          product: { select: { name: true } },
          voucher: { select: { code: true } },
        },
      });

      const csvData = allTransactions.map((t) => ({
        "Order ID": t.orderId,
        "Produk": t.product.name,
        "Agen": t.agent?.username || "Customer (Langsung)",
        "Nama Pembeli": t.customerName || "-",
        "Voucher": t.voucher?.code || "-",
        "Harga Asli": t.originalPrice,
        "Diskon": t.discountAmount,
        "Total Bayar": t.finalAmount,
        "Status": t.status,
        "Tgl Bayar": t.paidAt ? new Date(t.paidAt).toLocaleString("id-ID") : "-",
        "Link Redeem": t.redeemUrl || "-",
      }));

      const csv = exportToCsv(csvData, "laporan-penjualan");
      const filename = `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.csv`;

      // Upload to Google Drive (must be awaited on Vercel so the process doesn't die)
      try {
        await uploadCsvToDrive(filename, csv);
      } catch (e: any) {
        log.error("Failed to upload to GDrive", { error: String(e) });
        return NextResponse.json(
          { error: `Google Drive Upload Failed: ${e.message || String(e)}` },
          { status: 500 }
        );
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: "desc" },
        include: {
          agent: { select: { username: true } },
          product: { select: { name: true } },
          voucher: { select: { code: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      metrics: {
        totalGross: totalGross._sum.originalPrice || 0,
        totalNet: totalNet._sum.finalAmount || 0,
        totalSold,
      },
      agents,
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    log.error("Reports GET error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { orderId },
      select: { status: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status === "PENDING" || transaction.status === "PAID") {
      // Allow deletion, but maybe warn if PAID. For this fix, we just ensure it exists.
      // In a real app, deleting a PAID transaction might need to return the stock.
      // But for this race condition fix, we just do a safe read-before-delete.
    }

    await prisma.transaction.delete({
      where: { orderId },
    });

    log.info("Transaction deleted manually", { orderId });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Transaction DELETE error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
