import { NextResponse } from "next/server";
import { syncSupplierStocks } from "@/lib/suppliers/sync";
import { cache } from "@/lib/cache";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "public-sync-stock" });

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    cache.delete("catalog-products");
    const result = await syncSupplierStocks();
    cache.delete("catalog-products");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("Failed to public sync supplier stock", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}