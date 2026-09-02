import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";
import { streamSalesInsight } from "@/lib/anthropic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

/**
 * Build a compact, plain-text summary of the last 30 days of sales data
 * (product performance, agent performance, daily trend) to feed as context
 * to the AI analysis prompt.
 */
function buildSalesDataSummary(
  transactions: {
    finalAmount: number;
    paidAt: Date | null;
    product: { name: string };
    agent: { username: string };
  }[]
): string {
  if (transactions.length === 0) {
    return "Tidak ada transaksi berhasil (status PAID) dalam 30 hari terakhir.";
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + t.finalAmount, 0);
  const totalCount = transactions.length;

  // Per-product aggregation
  const productMap = new Map<string, { count: number; revenue: number }>();
  for (const t of transactions) {
    const entry = productMap.get(t.product.name) || { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += t.finalAmount;
    productMap.set(t.product.name, entry);
  }
  const productLines = Array.from(productMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(
      ([name, v]) =>
        `- ${name}: ${v.count} terjual, omset ${formatRupiah(v.revenue)}`
    )
    .join("\n");

  // Per-agent aggregation
  const agentMap = new Map<string, { count: number; revenue: number }>();
  for (const t of transactions) {
    const entry = agentMap.get(t.agent.username) || { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += t.finalAmount;
    agentMap.set(t.agent.username, entry);
  }
  const agentLines = Array.from(agentMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(
      ([name, v]) =>
        `- ${name}: ${v.count} transaksi, omset ${formatRupiah(v.revenue)}`
    )
    .join("\n");

  // Daily trend: compare first half vs second half of the 30-day window
  const dailyMap = new Map<string, number>();
  for (const t of transactions) {
    if (!t.paidAt) continue;
    const day = t.paidAt.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) || 0) + t.finalAmount);
  }
  const dailyLines = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, revenue]) => `${day}: ${formatRupiah(revenue)}`)
    .join("\n");

  return `PERIODE: 30 hari terakhir
TOTAL TRANSAKSI BERHASIL: ${totalCount}
TOTAL OMSET: ${formatRupiah(totalRevenue)}
RATA-RATA PER TRANSAKSI: ${formatRupiah(Math.round(totalRevenue / totalCount))}

PERFORMA PER PRODUK (urut dari paling laris):
${productLines}

PERFORMA PER AGEN (urut dari omset terbesar):
${agentLines}

OMSET HARIAN (kronologis, untuk analisis tren):
${dailyLines}`;
}

export async function POST() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Fitur AI Insight belum dikonfigurasi. Hubungi admin." },
      { status: 503 }
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await prisma.transaction.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: thirtyDaysAgo },
    },
    orderBy: { paidAt: "asc" },
    include: {
      product: { select: { name: true } },
      agent: { select: { username: true } },
    },
  });

  const salesDataSummary = buildSalesDataSummary(transactions);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamSalesInsight(salesDataSummary)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        console.error("AI Insight streaming error:", error);
        controller.enqueue(
          encoder.encode(
            "\n\n_Terjadi kesalahan saat menghasilkan analisis. Silakan coba lagi._"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
