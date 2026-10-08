import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeBearer } from "@/lib/bridge/auth";
import { isBridgeIpAllowed } from "@/lib/bridge/ipAllowlist";
import { checkBridgeRateLimit } from "@/lib/bridge/rateLimit";
import { stockTopupSchema } from "@/lib/bridge/schema";
import { handleStockTopup } from "@/lib/bridge/topup";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  return POST(request);
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    
    // Idempotency check via header
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey && idempotencyKey !== body.transaction_id) {
      return NextResponse.json({ error: "Idempotency-Key header does not match body transaction_id" }, { status: 400 });
    }

    const parsed = stockTopupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const result = await handleStockTopup(parsed.data);

    if (result.status >= 400) {
       return NextResponse.json({ error: result.message, ...result }, { status: result.status });
    }

    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error("Webhook topup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
