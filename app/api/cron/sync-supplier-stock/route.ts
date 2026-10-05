import { NextRequest, NextResponse } from "next/server";
import { syncSupplierStocks } from "@/lib/suppliers/sync";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "cron-sync-supplier-stock" });

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      log.warn("Unauthorized sync-supplier-stock cron attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncSupplierStocks();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error("Error in sync-supplier-stock cron", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}