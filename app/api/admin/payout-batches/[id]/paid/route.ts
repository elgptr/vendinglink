import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAdminRateLimit } from "@/lib/adminRateLimit";
import { markPayoutPaid, PayoutConflictError, PayoutNotFoundError } from "@/lib/promo/markPayoutPaid";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-payout-paid" });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = checkAdminRateLimit(request);
    if (!rate.allowed) return rate.response;
    const session = await auth();
    if (!session || session.user.role !== "ADMIN" || !session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const batch = await markPayoutPaid(id, session.user.id);
    return NextResponse.json(batch);
  } catch (error) {
    if (error instanceof PayoutNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PayoutConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    log.error("Payout paid error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}