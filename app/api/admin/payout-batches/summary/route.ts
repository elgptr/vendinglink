import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAdminRateLimit } from "@/lib/adminRateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-payout-summary" });

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const rateCheck = checkAdminRateLimit(request);
    if (!rateCheck.allowed) return rateCheck.response;

    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await prisma.programConfig.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const minPayoutAmount = config?.minPayoutAmount ?? 20000;
    const accrualWindowDays = config?.accrualWindowDays ?? 15;

    // Fetch all customers that either own a referral code or have credits
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { referralCode: { isNot: null } },
          { credits: { some: {} } },
        ],
      },
      include: {
        referralCode: { select: { code: true } },
        credits: {
          select: {
            id: true,
            kind: true,
            amount: true,
            status: true,
            payableAt: true,
            payoutBatchId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const referrers = customers.map((c) => {
      let payableAmount = 0;
      let accruedAmount = 0;
      let paidAmount = 0;
      let earliestPayableAt: Date | null = null;

      for (const credit of c.credits) {
        if (credit.kind !== "REFERRAL_COMMISSION") continue;

        if (credit.status === "PAYABLE" && !credit.payoutBatchId) {
          payableAmount += credit.amount;
        } else if (credit.status === "ACCRUED") {
          accruedAmount += credit.amount;
          if (credit.payableAt) {
            if (!earliestPayableAt || credit.payableAt < earliestPayableAt) {
              earliestPayableAt = credit.payableAt;
            }
          }
        } else if (credit.status === "PAID") {
          paidAmount += credit.amount;
        }
      }

      let daysUntilMaturity: number | null = null;
      if (earliestPayableAt) {
        const diffMs = earliestPayableAt.getTime() - now.getTime();
        daysUntilMaturity = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      let eligibilityStatus: "READY" | "BELOW_THRESHOLD" | "WAITING_ACCRUAL" | "ZERO_CREDIT" = "ZERO_CREDIT";
      if (payableAmount >= minPayoutAmount) {
        eligibilityStatus = "READY";
      } else if (payableAmount > 0) {
        eligibilityStatus = "BELOW_THRESHOLD";
      } else if (accruedAmount > 0) {
        eligibilityStatus = "WAITING_ACCRUAL";
      }

      return {
        customerId: c.id,
        phone: c.phone,
        name: c.name,
        referralCode: c.referralCode?.code ?? null,
        payableAmount,
        accruedAmount,
        paidAmount,
        earliestPayableAt: earliestPayableAt?.toISOString() ?? null,
        daysUntilMaturity,
        eligibilityStatus,
      };
    });

    const totalPayable = referrers.reduce((sum, r) => sum + r.payableAmount, 0);
    const totalAccrued = referrers.reduce((sum, r) => sum + r.accruedAmount, 0);
    const totalPaid = referrers.reduce((sum, r) => sum + r.paidAmount, 0);
    const eligibleCount = referrers.filter((r) => r.eligibilityStatus === "READY").length;
    const waitingAccrualCount = referrers.filter((r) => r.eligibilityStatus === "WAITING_ACCRUAL" || r.accruedAmount > 0).length;

    return NextResponse.json({
      config: {
        minPayoutAmount,
        accrualWindowDays,
      },
      metrics: {
        totalPayable,
        totalAccrued,
        totalPaid,
        eligibleCount,
        waitingAccrualCount,
        totalReferrers: referrers.length,
      },
      referrers,
    });
  } catch (error) {
    log.error("Payout summary GET error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
