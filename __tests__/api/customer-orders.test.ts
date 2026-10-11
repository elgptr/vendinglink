import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/customer/orders/route";
import {
  createMockProduct,
  createMockTransaction,
  cleanupTestDatabase,
} from "../helpers/fixtures";

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }),
}));

let ipCounter = 0;
function getRequest(phone: string | null) {
  ipCounter += 1;
  const url =
    phone === null
      ? "http://localhost:3000/api/customer/orders"
      : `http://localhost:3000/api/customer/orders?phone=${encodeURIComponent(phone)}`;
  return new NextRequest(url, {
    method: "GET",
    headers: { "x-forwarded-for": `10.9.0.${ipCounter}` },
  });
}

function uniquePhone() {
  const suffix = Math.floor(Math.random() * 1e9)
    .toString()
    .padStart(9, "0");
  const operator = Math.floor(Math.random() * 90 + 10); // 2-digit mobile prefix
  return `08${operator}${suffix}`;
}

describe("api/customer/orders (ST-1b-3 / TD-10)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("400s on missing phone", async () => {
    const res = await GET(getRequest(null));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("wajib diisi");
  });

  it("400s on invalid phone (previously matched any substring via `contains`)", async () => {
    // A 3-digit guess must be rejected now — it is not a valid full number and
    // can no longer be used to pull back another customer's orders.
    const res = await GET(getRequest("123"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("tidak valid");
  });

  it("finds PAID orders via the same number in 08xx, 628xx, and +628xx form", async () => {
    const phone = uniquePhone();
    const subscriber = `62${phone.slice(1)}`;
    const product = await createMockProduct(prisma);
    await createMockTransaction(prisma, {
      productId: product.id,
      status: "PAID",
      customerPhone: phone, // raw 08xx, as stored at checkout
      paidAt: new Date(),
      finalAmount: 50000,
    });

    for (const variant of [phone, subscriber, `+${subscriber}`]) {
      const res = await GET(getRequest(variant));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].finalAmount).toBe(50000);
      expect(data.orders[0].productName).toBe(product.name);
    }
  });

  it("also matches orders already stored in 628xx form", async () => {
    const phone = uniquePhone();
    const subscriber = `62${phone.slice(1)}`;
    const product = await createMockProduct(prisma);
    await createMockTransaction(prisma, {
      productId: product.id,
      status: "PAID",
      customerPhone: subscriber,
      paidAt: new Date(),
    });

    const res = await GET(getRequest(phone));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orders.length).toBeGreaterThanOrEqual(1);
  });

  it("does not return orders of other customers (8-digit fixed prefix)", async () => {
    const phoneA = uniquePhone();
    // The route matches on the first 8 digits of the subscriber number
    // (digits 1-8 of "62XXXXXXXXXX" minus the country code, i.e. phone[2:10]).
    const prefixOf = (p: string) => p.slice(2, 10);
    let phoneB = uniquePhone();
    let guard = 0;
    while (prefixOf(phoneB) === prefixOf(phoneA) && guard < 50) {
      phoneB = uniquePhone();
      guard += 1;
    }
    expect(prefixOf(phoneB)).not.toBe(prefixOf(phoneA));
    const product = await createMockProduct(prisma);
    await createMockTransaction(prisma, {
      productId: product.id,
      status: "PAID",
      customerPhone: phoneB,
      paidAt: new Date(),
    });

    const res = await GET(getRequest(phoneA));
    expect(res.status).toBe(200);
    const data = await res.json();
    const otherOrders = await prisma.transaction.findMany({
      where: { customerPhone: phoneB },
      select: { orderId: true },
    });
    const otherIds = otherOrders.map((t) => t.orderId);
    const returnedIds = (data.orders as Array<{ orderId: string }>).map((o) => o.orderId);
    expect(returnedIds.filter((id) => otherIds.includes(id))).toHaveLength(0);
  });

  it("only returns PAID orders", async () => {
    const phone = uniquePhone();
    const product = await createMockProduct(prisma);
    await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
      customerPhone: phone,
    });

    const res = await GET(getRequest(phone));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orders).toHaveLength(0);
  });

  it("returns 429 after 10 lookups per minute per IP", async () => {
    const phone = uniquePhone();
    const ip = "10.9.9.9";
    const makeFromIp = () =>
      new NextRequest(
        `http://localhost:3000/api/customer/orders?phone=${encodeURIComponent(phone)}`,
        { method: "GET", headers: { "x-forwarded-for": ip } }
      );

    for (let i = 0; i < 10; i++) {
      const res = await GET(makeFromIp());
      expect(res.status).not.toBe(429);
    }
    const limited = await GET(makeFromIp());
    expect(limited.status).toBe(429);
    const data = await limited.json();
    expect(data.error).toContain("Terlalu banyak");
  });
});
