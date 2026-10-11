import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/payout-batches/[id]/paid/route";
import { cleanupTestDatabase, createMockUser } from "../helpers/fixtures";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/adminRateLimit", () => ({ checkAdminRateLimit: vi.fn(() => ({ allowed: true })) }));

const request = () => new NextRequest("http://localhost/api/admin/payout-batches/paid", { method: "POST" });
const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("admin payout mark paid (ST-2g)", () => {
  let client: PrismaClient;
  let auth: ReturnType<typeof vi.fn>;
  let rate: ReturnType<typeof vi.fn>;
  let adminId: string;
  let batchId: string;
  let creditId: string;

  beforeAll(async () => {
    client = new PrismaClient();
    await cleanupTestDatabase(client);
    await client.customer.deleteMany();
    const user = await createMockUser(client, { role: "ADMIN" });
    adminId = user.id;
    const customer = await client.customer.create({ data: { phone: "628888000019" } });
    const batch = await client.payoutBatch.create({ data: { period: "2099-07", channel: "GOPAY", totalAmount: 20000 } });
    batchId = batch.id;
    const credit = await client.customerCredit.create({
      data: { customerId: customer.id, kind: "REFERRAL_COMMISSION", amount: 20000, status: "PAYABLE", payoutBatchId: batchId },
    });
    creditId = credit.id;
    auth = (await import("@/lib/auth")).auth as ReturnType<typeof vi.fn>;
    rate = (await import("@/lib/adminRateLimit")).checkAdminRateLimit as ReturnType<typeof vi.fn>;
  });

  afterAll(async () => {
    await cleanupTestDatabase(client);
    await client.customer.deleteMany();
    await client.$disconnect();
  });

  beforeEach(() => {
    auth.mockReset();
    rate.mockReset().mockReturnValue({ allowed: true });
  });

  it("rejects non-admin and rate-limited requests", async () => {
    auth.mockResolvedValue(null);
    expect((await POST(request(), context(batchId))).status).toBe(403);
    auth.mockResolvedValue({ user: { id: adminId, role: "AGENT" } });
    expect((await POST(request(), context(batchId))).status).toBe(403);
    rate.mockReturnValueOnce({ allowed: false, response: Response.json({}, { status: 429 }) });
    expect((await POST(request(), context(batchId))).status).toBe(429);
  });

  it("returns 404 for a missing batch", async () => {
    auth.mockResolvedValue({ user: { id: adminId, role: "ADMIN" } });
    expect((await POST(request(), context("missing"))).status).toBe(404);
  });

  it("rejects payout if a linked credit is no longer PAYABLE, without mutating the batch", async () => {
    auth.mockResolvedValue({ user: { id: adminId, role: "ADMIN" } });
    await client.customerCredit.update({ where: { id: creditId }, data: { status: "VOID" } });
    expect((await POST(request(), context(batchId))).status).toBe(409);
    expect((await client.payoutBatch.findUniqueOrThrow({ where: { id: batchId } })).status).toBe("DRAFT");
    await client.customerCredit.update({ where: { id: creditId }, data: { status: "PAYABLE" } });
  });

  it("atomically marks batch and credits PAID, records admin, and rejects repeats", async () => {
    auth.mockResolvedValue({ user: { id: adminId, role: "ADMIN" } });
    const res = await POST(request(), context(batchId));
    expect(res.status).toBe(200);
    const batch = await client.payoutBatch.findUniqueOrThrow({ where: { id: batchId } });
    const admin = await client.user.findUniqueOrThrow({ where: { id: adminId } });
    expect(batch).toMatchObject({ status: "PAID", approvedBy: admin.username });
    expect(batch.approvedAt).toBeInstanceOf(Date);
    expect((await client.customerCredit.findUniqueOrThrow({ where: { id: creditId } })).status).toBe("PAID");
    expect((await POST(request(), context(batchId))).status).toBe(409);
  });
});