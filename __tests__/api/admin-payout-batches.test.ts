import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/payout-batches/route";
import { GET as GET_CSV } from "@/app/api/admin/payout-batches/[id]/csv/route";
import { createMockUser, cleanupTestDatabase } from "../helpers/fixtures";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/adminRateLimit", () => ({
  checkAdminRateLimit: () => ({ allowed: true }),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }),
}));

const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);

function jsonRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("api/admin/payout-batches (ST-2f)", () => {
  let prisma: PrismaClient;
  let auth: ReturnType<typeof vi.fn>;

  async function mockAdmin() {
    const admin = await createMockUser(prisma, { role: "ADMIN" });
    auth.mockResolvedValueOnce({ user: { id: admin.id, role: "ADMIN" } });
  }

  async function makePayableCredits(phone: string, amounts: number[]) {
    const customer = await prisma.customer.create({ data: { phone } });
    for (const amount of amounts) {
      await prisma.customerCredit.create({
        data: {
          customerId: customer.id,
          kind: "REFERRAL_COMMISSION",
          amount,
          status: "PAYABLE",
          payableAt: PAST,
        },
      });
    }
    return customer;
  }

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
    await prisma.customerCredit.deleteMany({});
    await prisma.payoutBatch.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.programConfig.deleteMany({});
    await prisma.programConfig.create({ data: { minPayoutAmount: 20000 } });

    const authModule = await import("@/lib/auth");
    auth = authModule.auth as ReturnType<typeof vi.fn>;
  });

  afterAll(async () => {
    await prisma.customerCredit.deleteMany({});
    await prisma.payoutBatch.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.programConfig.deleteMany({});
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  beforeEach(() => {
    auth.mockReset();
  });

  it("403s unauthenticated requests on GET and POST", async () => {
    auth.mockResolvedValue(null);
    const get = await GET(
      jsonRequest("GET", "http://localhost:3000/api/admin/payout-batches")
    );
    expect(get.status).toBe(403);
    const post = await POST(
      jsonRequest("POST", "http://localhost:3000/api/admin/payout-batches", {
        period: "2099-10",
        channel: "GOPAY",
      })
    );
    expect(post.status).toBe(403);
  });

  it("400s on an invalid period format", async () => {
    await mockAdmin();
    const res = await POST(
      jsonRequest("POST", "http://localhost:3000/api/admin/payout-batches", {
        period: "10-2099",
        channel: "GOPAY",
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects bank transfer without an account number", async () => {
    await mockAdmin();
    const res = await POST(jsonRequest("POST", "http://localhost:3000/api/admin/payout-batches", {
      period: "2099-10", channel: "BANK_TRANSFER",
    }));
    expect(res.status).toBe(400);
  });

  it("generates a batch and lists it", async () => {
    await makePayableCredits("628777000001", [12000, 10000]);

    await mockAdmin();
    const res = await POST(
      jsonRequest("POST", "http://localhost:3000/api/admin/payout-batches", {
        period: "2099-10",
        channel: "GOPAY",
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.batch.totalAmount).toBe(22000);
    expect(data.batch.status).toBe("DRAFT");
    expect(data.lines).toHaveLength(1);
    expect(data.lines[0].phone).toBe("628777000001");

    await mockAdmin();
    const list = await GET(
      jsonRequest("GET", "http://localhost:3000/api/admin/payout-batches")
    );
    expect(list.status).toBe(200);
    const batches = await list.json();
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({
      period: "2099-10",
      channel: "GOPAY",
      totalAmount: 22000,
      status: "DRAFT",
      creditCount: 2,
    });
  });

  it("409s on a duplicate period + channel", async () => {
    await mockAdmin();
    const res = await POST(
      jsonRequest("POST", "http://localhost:3000/api/admin/payout-batches", {
        period: "2099-10",
        channel: "GOPAY",
      })
    );
    expect(res.status).toBe(409);
  });

  it("returns batch:null when nothing meets the threshold", async () => {
    await makePayableCredits("628777000002", [5000]);

    await mockAdmin();
    const res = await POST(
      jsonRequest("POST", "http://localhost:3000/api/admin/payout-batches", {
        period: "2099-11",
        channel: "OVO",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.batch).toBeNull();
    expect(data.skippedBelowThreshold).toBe(1);
    expect(data.message).toBeTruthy();
  });

  it("serves the batch CSV to admins only", async () => {
    // CSV requires admin auth.
    auth.mockResolvedValueOnce(null);
    const forbidden = await GET_CSV(
      jsonRequest("GET", "http://localhost:3000/api/admin/payout-batches/x/csv"),
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(forbidden.status).toBe(403);

    // Unknown batch → 404.
    await mockAdmin();
    const missing = await GET_CSV(
      jsonRequest("GET", "http://localhost:3000/api/admin/payout-batches/x/csv"),
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(missing.status).toBe(404);

    // Existing batch → CSV with one row per referrer.
    const batch = await prisma.payoutBatch.findFirstOrThrow({
      where: { period: "2099-10" },
    });
    await mockAdmin();
    const res = await GET_CSV(
      jsonRequest(
        "GET",
        `http://localhost:3000/api/admin/payout-batches/${batch.id}/csv`
      ),
      { params: Promise.resolve({ id: batch.id }) }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const text = await res.text();
    expect(text).toContain("phone,name,amount,credit_count");
    expect(text).toContain("628777000001,,22000,2");
  });
});
