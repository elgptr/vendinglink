import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeBearer } from "@/lib/bridge/auth";
import { isBridgeIpAllowed } from "@/lib/bridge/ipAllowlist";
import { checkBridgeRateLimit } from "@/lib/bridge/rateLimit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isBridgeIpAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = checkBridgeRateLimit(request);
  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  if (!verifyBridgeBearer(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { id: { equals: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        price: true,
        type: true,
        supplierMode: true,
        supplierProductId: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json({ success: true, products }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Bridge products listing error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
