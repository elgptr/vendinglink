import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeBearer } from "@/lib/bridge/auth";
import { isBridgeIpAllowed } from "@/lib/bridge/ipAllowlist";
import { checkBridgeRateLimit } from "@/lib/bridge/rateLimit";
import { categoryUpdateSchema } from "@/lib/bridge/schema";
import { updateProductCategory } from "@/lib/bridge/category";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vlProductId: string }> }
) {
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

  try {
    const { vlProductId } = await params;
    const body = await request.json();

    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await updateProductCategory(vlProductId, parsed.data.categorySlug);

    if (result.status === 200) {
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(
      { error: result.code, message: result.message },
      { status: result.status }
    );
  } catch (error) {
    console.error("Bridge category update error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
