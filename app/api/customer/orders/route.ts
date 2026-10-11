import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { createRateLimiter } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// A five-way knowledge question alone is not authentication. The buyer also
// needs the unguessable order ID from their purchase confirmation.
const lookupLimiter = createRateLimiter(10, 60_000);
const failure = () => NextResponse.json({ error: "Verifikasi tidak berhasil" }, { status: 404 });

function limited(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "anonymous";
  return !lookupLimiter.check(ip).allowed;
}

async function eligibleOrder(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const customer = await prisma.customer.findUnique({
    where: { phone: normalized }, select: { id: true, consentPromoAt: true },
  });
  if (!customer?.consentPromoAt) return null;
  // Historical orders may contain 08, 62 or +62. Never use substring matches;
  // customerId is authoritative where present, and normalize legacy rows.
  const candidates = await prisma.transaction.findMany({
    where: {
      status: "PAID",
      OR: [
        { customerId: customer.id },
        { customerId: null, customerPhone: { in: [normalized, `+${normalized}`, `0${normalized.slice(2)}`] } },
      ],
    },
    select: { id: true, orderId: true, productId: true, paidAt: true, createdAt: true },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 1,
  });
  return { normalized, customer, last: candidates[0] ?? null };
}

export async function GET(request: NextRequest) {
  if (limited(request)) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });
  const phone = new URL(request.url).searchParams.get("phone");
  if (!phone || !normalizePhone(phone)) return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
  const eligible = await eligibleOrder(phone);
  if (!eligible?.last) return failure();

  // Rank decoys by fulfilled sales; exclude the correct product, inactive
  // entries and duplicate names (indistinguishable answers). No filler/repeats.
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, _count: { select: { transactions: { where: { status: "PAID", stockStatus: "FULFILLED" } } } } },
  });
  const answer = products.find((product) => product.id === eligible.last?.productId);
  if (!answer) return failure();
  const names = new Set([answer.name.trim().toLocaleLowerCase()]);
  const decoys = products.filter((product) => product.id !== answer.id)
    .sort((a, b) => b._count.transactions - a._count.transactions || a.id.localeCompare(b.id))
    .filter((product) => {
      const name = product.name.trim().toLocaleLowerCase();
      if (names.has(name)) return false;
      names.add(name);
      return true;
    }).slice(0, 4);
  if (decoys.length < 4) return failure();
  const options = [answer, ...decoys].map(({ id, name }) => ({ id, name }));
  // Fisher-Yates using CSPRNG; do not bias the correct answer's position.
  for (let i = options.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return NextResponse.json({ options }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (limited(request)) return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return failure(); }
  if (!body || typeof body !== "object") return failure();
  const { phone, productId, orderId } = body as Record<string, unknown>;
  if (typeof phone !== "string" || typeof productId !== "string" || typeof orderId !== "string"
      || phone.length > 20 || productId.length > 100 || orderId.length > 100) return failure();
  const eligible = await eligibleOrder(phone);
  if (!eligible?.last || eligible.last.productId !== productId) return failure();

  // The receipt's order ID must belong to this same phone/customer. Order
  // details and redeem credentials are released only after BOTH checks.
  const proof = await prisma.transaction.findUnique({ where: { orderId },
    select: { customerId: true, customerPhone: true, status: true },
  });
  if (!proof || proof.status !== "PAID" || (
    proof.customerId !== eligible.customer.id &&
    (proof.customerId !== null || normalizePhone(proof.customerPhone ?? "") !== eligible.normalized)
  )) return failure();

  const orders = await prisma.transaction.findMany({
    where: {
      status: "PAID",
      OR: [
        { customerId: eligible.customer.id },
        { customerId: null, customerPhone: { in: [eligible.normalized, `+${eligible.normalized}`, `0${eligible.normalized.slice(2)}`] } },
      ],
    },
    select: { orderId: true, redeemUrl: true, finalAmount: true, paidAt: true, stockStatus: true,
      product: { select: { name: true, type: true } } },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }], take: 20,
  });
  return NextResponse.json({ orders: orders.map((order) => ({
    orderId: order.orderId, productName: order.product.name, productType: order.product.type,
    redeemUrl: order.stockStatus === "FULFILLED" ? order.redeemUrl : null,
    finalAmount: order.finalAmount, paidAt: order.paidAt, stockStatus: order.stockStatus,
  })) }, { headers: { "Cache-Control": "no-store" } });
}