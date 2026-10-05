/**
 * Admin — DigitalCore Supplier API
 *
 * GET /api/admin/supplier/balance   → { balance: number }
 * GET /api/admin/supplier/products  → SupplierProduct[]
 *
 * Both endpoints are admin-only and guarded by session check.
 * Results are NOT cached (always fresh from DigitalCore).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rezekiSupplier } from "@/lib/suppliers";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-supplier-api" });

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action"); // "balance" | "products"
  const supplier = rezekiSupplier;

  // ── GET balance ───────────────────────────────────────────────────────────
  if (action === "balance") {
    try {
      const balance = await supplier.checkBalance();
      return NextResponse.json({ balance });
    } catch (err) {
      log.error(`Failed to fetch ${supplier.name} balance`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: `Gagal mengambil balance dari ${supplier.name}. Periksa API Key.` },
        { status: 502 }
      );
    }
  }

  // ── GET catalog ───────────────────────────────────────────────────────────
  if (action === "products") {
    try {
      const products = await supplier.getProducts();
      return NextResponse.json(products);
    } catch (err) {
      log.error(`Failed to fetch ${supplier.name} products`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        {
          error:
            `Gagal mengambil katalog dari ${supplier.name}. Periksa API Key atau koneksi.`,
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    { error: "Parameter 'action' harus 'balance' atau 'products'" },
    { status: 400 }
  );
}
