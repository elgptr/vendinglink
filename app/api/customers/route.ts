import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rateLimit";
import { verifyCsrfRequest, extractCsrfTokens } from "@/lib/csrf";
import { validatePayloadSize } from "@/lib/inputValidation";
import { upsertCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "customers" });

// Public customer registration endpoint (ST-2b): 10 attempts / min / IP.
const customerRegistrationLimiter = createRateLimiter(10, 60 * 1000);

const customerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20),
  consentPromo: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    if (!customerRegistrationLimiter.check(ip).allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const { cookieToken, submittedToken } = extractCsrfTokens(
      request.headers.get("cookie"),
      request.headers.get("x-csrf-token")
    );
    if (!verifyCsrfRequest(cookieToken, submittedToken)) {
      return NextResponse.json({ error: "CSRF token tidak valid" }, { status: 403 });
    }

    const contentLength = request.headers.get("content-length");
    const sizeCheck = validatePayloadSize(contentLength ? Number(contentLength) : null);
    if (!sizeCheck.allowed) {
      return NextResponse.json({ error: sizeCheck.reason }, { status: 413 });
    }

    const body = await request.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Input tidak valid", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, phone, consentPromo } = parsed.data;

    const result = await upsertCustomer({
      prisma,
      phone,
      name,
      consentPromo,
    });

    log.info("Customer upserted", { customerId: result.id, phone: result.phone });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    log.error("Customer registration error", { error: message });
    const status = message.toLowerCase().includes("tidak valid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
