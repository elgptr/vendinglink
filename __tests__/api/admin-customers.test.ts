import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/customers/route";
import { cleanupTestDatabase, createMockTransaction } from "../helpers/fixtures";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/adminRateLimit", () => ({ checkAdminRateLimit: vi.fn(() => ({ allowed: true })) }));

const request = (page?: string) => new NextRequest(`http://localhost/api/admin/customers${page ? `?page=${page}` : ""}`);

describe("GET /api/admin/customers (ST-1a-1)", () => {
  let client: PrismaClient;
  let auth: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    client = new PrismaClient();
    await cleanupTestDatabase(client);
    await client.customer.deleteMany();
    const consented = await client.customer.create({
      data: { phone: "628888123456", name: "Pelanggan Satu", consentPromoAt: new Date("2026-10-01T00:00:00Z") },
    });
    await client.customer.create({ data: { phone: "628888123457", name: "Tanpa Consent" } });
    await client.referralCode.create({ data: { customerId: consented.id, code: "ABCDEF1234567" } });
    const orders = await Promise.all([
      createMockTransaction(client, { status: "PAID", finalAmount: 22000 }),
      createMockTransaction(client, { status: "PAID", finalAmount: 30000 }),
      createMockTransaction(client, { status: "PENDING", finalAmount: 5000 }),
    ]);
    await client.transaction.updateMany({
      where: { id: { in: orders.map((order) => order.id) } },
      data: { customerId: consented.id },
    });
    auth = (await import("@/lib/auth")).auth as ReturnType<typeof vi.fn>;
  });

  afterAll(async () => {
    await cleanupTestDatabase(client);
    await client.referralCode.deleteMany();
    await client.customer.deleteMany();
    await client.$disconnect();
  });

  beforeEach(() => auth.mockReset());

  it("restricts the list to admins", async () => {
    auth.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(403);
    auth.mockResolvedValue({ user: { role: "AGENT" } });
    expect((await GET(request())).status).toBe(403);
  });

  it("validates pagination", async () => {
    auth.mockResolvedValue({ user: { role: "ADMIN" } });
    for (const page of ["0", "-1", "abc", "99999999"]) {
      expect((await GET(request(page))).status).toBe(400);
    }
  });

  it("lists consent, code and PAID order totals without including pending orders", async () => {
    auth.mockResolvedValue({ user: { role: "ADMIN" } });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const data = await response.json();
    expect(data.total).toBe(2);
    expect(data.customers).toHaveLength(2);
    expect(data.customers.find((c: { phone: string }) => c.phone === "628888123456")).toMatchObject({
      referralCode: "ABCDEF1234567", orderCount: 2, totalSpent: 52000,
      consentPromoAt: "2026-10-01T00:00:00.000Z",
    });
    expect(data.customers.find((c: { phone: string }) => c.phone === "628888123457")).toMatchObject({
      consentPromoAt: null, referralCode: null, orderCount: 0, totalSpent: 0,
    });
    const secondPage = await (await GET(request("2"))).json();
    expect(secondPage.customers).toEqual([]);
  });

  it("limits results to 25 rows and paginates without duplicating customers", async () => {
    auth.mockResolvedValue({ user: { role: "ADMIN" } });
    await client.customer.createMany({
      data: Array.from({ length: 24 }, (_, index) => ({ phone: `62888820${String(index).padStart(6, "0")}` })),
    });
    const first = await (await GET(request("1"))).json();
    const second = await (await GET(request("2"))).json();
    expect(first.total).toBe(26);
    expect(first.totalPages).toBe(2);
    expect(first.customers).toHaveLength(25);
    expect(second.customers).toHaveLength(1);
    expect(new Set([...first.customers, ...second.customers].map((c: { id: string }) => c.id)).size).toBe(26);
  });
});