import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeBearer } from "@/lib/bridge/auth";
import { isBridgeIpAllowed } from "@/lib/bridge/ipAllowlist";
import { checkBridgeRateLimit } from "@/lib/bridge/rateLimit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const syncMappingSchema = z.object({
  supplierCode: z.string().min(1, "supplierCode is required"),
  supplierProductId: z.string().min(1, "supplierProductId is required"),
  productId: z.string().min(1, "productId is required"),
  priority: z.number().int().positive().optional().default(1),
});

/**
 * POST /api/bridge/mappings
 * Upserts a SupplierProductMapping row when approved via Telegram or Hermes Agent.
 */
export async function POST(req: NextRequest) {
  if (!isBridgeIpAllowed(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = checkBridgeRateLimit(req);
  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  if (!verifyBridgeBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = syncMappingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { supplierCode, supplierProductId, productId, priority } = parsed.data;

    // Verify product exists in Storefront
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: `Product with ID ${productId} not found in Storefront` },
        { status: 404 }
      );
    }

    const mapping = await prisma.supplierProductMapping.upsert({
      where: {
        supplierCode_supplierProductId: {
          supplierCode,
          supplierProductId,
        },
      },
      update: {
        productId,
      },
      create: {
        supplierCode,
        supplierProductId,
        productId,
      },
    });

    // Also update Product's supplierMode and supplierProductId so it links seamlessly
    await prisma.product.update({
      where: { id: productId },
      data: {
        supplierMode: "AUTO",
        supplierProductId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Supplier product mapping successfully synchronized",
        mapping,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to sync supplier product mapping:", msg);
    return NextResponse.json(
      { error: "Internal server error syncing mapping", details: msg },
      { status: 500 }
    );
  }
}
