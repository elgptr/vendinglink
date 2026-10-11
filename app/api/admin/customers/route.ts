import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAdminRateLimit } from "@/lib/adminRateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-customers" });

export async function GET(request: NextRequest) {
  try {
    const rate = checkAdminRateLimit(request);
    if (!rate.allowed) return rate.response;
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawPage = request.nextUrl.searchParams.get("page") ?? "1";
    if (!/^[1-9]\d{0,5}$/.test(rawPage)) {
      return NextResponse.json({ error: "Halaman tidak valid" }, { status: 400 });
    }
    const page = Number(rawPage);
    const pageSize = 25;
    const [total, customers] = await prisma.$transaction([
      prisma.customer.count(),
      prisma.customer.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, phone: true, name: true, consentPromoAt: true, createdAt: true,
          referralCode: { select: { code: true } },
        },
      }),
    ]);

    const orderTotals = customers.length ? await prisma.transaction.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customers.map((customer) => customer.id) }, status: "PAID" },
      _count: { _all: true },
      _sum: { finalAmount: true },
    }) : [];
    const totalsByCustomer = new Map(orderTotals.map((row) => [row.customerId, row]));

    return NextResponse.json({
      customers: customers.map(({ referralCode, ...customer }) => ({
        ...customer,
        referralCode: referralCode?.code ?? null,
        orderCount: totalsByCustomer.get(customer.id)?._count._all ?? 0,
        totalSpent: totalsByCustomer.get(customer.id)?._sum.finalAmount ?? 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    log.error("Customers GET error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}