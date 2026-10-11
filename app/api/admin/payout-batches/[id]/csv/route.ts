import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { buildPayoutBatchCsv } from "@/lib/promo/payout";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-payout-csv" });

// CSV berisi nomor HP referrer (data pribadi) — wajib admin auth.
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
    const csv = await buildPayoutBatchCsv(id);
    if (csv === null) {
      return NextResponse.json(
        { error: "Batch tidak ditemukan" },
        { status: 404 }
      );
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payout-batch-${id}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    log.error("Payout batch CSV error", { error: String(error) });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
