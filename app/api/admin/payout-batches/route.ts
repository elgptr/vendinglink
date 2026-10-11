import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAdminRateLimit } from "@/lib/adminRateLimit";
import {
  generatePayoutBatch,
  PayoutBatchExistsError,
  PAYOUT_CHANNELS,
} from "@/lib/promo/payout";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger({ module: "admin-payout-batches" });

const generateSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format periode harus YYYY-MM"),
  channel: z.enum(PAYOUT_CHANNELS),
});

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

    const batches = await prisma.payoutBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { credits: true } } },
    });

    return NextResponse.json(
      batches.map((b) => ({
        id: b.id,
        period: b.period,
        channel: b.channel,
        totalAmount: b.totalAmount,
        status: b.status,
        approvedBy: b.approvedBy,
        approvedAt: b.approvedAt,
        createdAt: b.createdAt,
        creditCount: b._count.credits,
      }))
    );
  } catch (error) {
    log.error("Payout batches GET error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateCheck = checkAdminRateLimit(request);
    if (!rateCheck.allowed) return rateCheck.response;

    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload tidak valid" },
        { status: 400 }
      );
    }

    const result = await generatePayoutBatch(parsed.data);

    if (!result.batch) {
      return NextResponse.json({
        batch: null,
        lines: [],
        skippedBelowThreshold: result.skippedBelowThreshold,
        message:
          "Tidak ada credit PAYABLE yang memenuhi ambang minimum payout untuk periode ini",
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PayoutBatchExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    log.error("Payout batches POST error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
