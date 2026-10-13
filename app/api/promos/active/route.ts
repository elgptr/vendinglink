import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const rules = await prisma.voucherRule.findMany({
    where: { kind: "SCHEDULED", isActive: true, validFrom: { lte: now }, validUntil: { gt: now } },
    select: { id: true, name: true, code: true, discountType: true, value: true,
      maxDiscount: true, minSpend: true, categoryId: true, validFrom: true, validUntil: true,
      quotaTotal: true, usedCount: true,
      bannerImageUrl: true, bannerText: true, bannerCtaText: true, bannerCtaUrl: true },
    orderBy: { validFrom: "desc" }, take: 50,
  });
  const promos = rules.filter((rule) => rule.quotaTotal === null || rule.usedCount < rule.quotaTotal)
    .slice(0, 10).map(({ quotaTotal: _quota, usedCount: _used, ...rule }) => rule);
  return NextResponse.json({ promos }, { headers: { "Cache-Control": "no-store" } });
}