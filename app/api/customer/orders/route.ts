import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { createRateLimiter } from "@/lib/rateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "customer-orders" });

// Public order-lookup endpoint — looked up by phone number with no account/session,
// so it must be rate limited to slow down phone-number brute forcing (TD-10).
const orderLookupLimiter = createRateLimiter(10, 60 * 1000); // 10 attempts / min / IP

// Number of digits (from the start of the normalized subscriber number, i.e. after
// the "62" country code) required to match. Matching on a short/arbitrary substring
// of the raw phone (the previous `contains: sanitizedPhone` behavior) let anyone
// enumerate a handful of digits and pull back any customer's paid orders, including
// `redeemUrl` — see Tech Debt TD-10. Fixed length still allows some ambiguity across
// numbers that share the same first 8 digits, but closes the "nilai makin pendek,
// makin mudah ditebak" brute force gap while remaining tolerant of the mixed
// 08xx / 628xx / +628xx formats that exist in historical `Transaction.customerPhone`
// data (that column is NOT normalized at write time, only `Customer.phone` is).
const PHONE_PREFIX_MATCH_LENGTH = 8;

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    if (!orderLookupLimiter.check(ip).allowed) {
      log.warn("Order lookup rate limited", { ip });
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone || phone.trim() === "") {
      return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
    }

    // Normalize to 628xxxxxxxxxx first so "0812...", "62812...", "+62812..." all
    // resolve to the same subscriber-number core before taking the match prefix.
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
    }

    // Strip the "62" country code so the prefix is anchored to the subscriber
    // number itself (e.g. "6282254203272" -> "82254203272" -> "82254203").
    const subscriberNumber = normalized.slice(2);
    if (subscriberNumber.length < PHONE_PREFIX_MATCH_LENGTH) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
    }
    const phonePrefix = subscriberNumber.slice(0, PHONE_PREFIX_MATCH_LENGTH);

    const orders = await prisma.transaction.findMany({
      where: {
        customerPhone: { contains: phonePrefix },
        status: "PAID",
      },
      include: {
        product: { select: { name: true, type: true, guideImageUrl: true, guideText: true } }
      },
      orderBy: { paidAt: "desc" },
      take: 20
    });


    const formattedOrders = orders.map(order => ({
      orderId: order.orderId,
      productName: order.product.name,
      productType: order.product.type,
      redeemUrl: order.redeemUrl,
      guideImageUrl: order.product.guideImageUrl,
      guideText: order.product.guideText,
      finalAmount: order.finalAmount,
      paidAt: order.paidAt,
      stockStatus: order.stockStatus,
      refundPromoCodeId: order.refundPromoCodeId
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    log.error("Order lookup failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
