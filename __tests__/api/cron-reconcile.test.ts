import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/reconcile/route";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";
import { getMidtransStatus } from "@/lib/midtrans";
import { getKaseraPaymentStatus } from "@/lib/kasera";
import {
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

// Gateways are never really called by the cron.
vi.mock("@/lib/midtrans", () => ({ getMidtransStatus: vi.fn() }));
vi.mock("@/lib/kasera", () => ({ getKaseraPaymentStatus: vi.fn() }));
// The PAID-transition machinery (stock claim, supplier purchase, WhatsApp,
// accrual) is covered elsewhere — the cron only needs to invoke it.
vi.mock("@/lib/transactionStatus", () => ({
  applyMidtransStatusUpdate: vi.fn(async () => ({ updated: true })),
}));

const CRON_SECRET = "test-cron-secret";
const CUSTOMER_PHONE = "628555000001";
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);
const STUCK_AGE = new Date(Date.now() - 26 * 60 * 60 * 1000); // > 25h cutoff

function cronRequest(auth = true): NextRequest {
  const headers = new Headers();
  if (auth) headers.set("authorization", `Bearer ${CRON_SECRET}`);
  return new NextRequest("http://localhost:3000/api/cron/reconcile", {
    method: "GET",
    headers,
  });
}

describe("GET /api/cron/reconcile — reconcile + credit promotion (ST-2e)", () => {
  let prisma: PrismaClient;
  let savedSecret: string | undefined;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
    await prisma.customerCredit.deleteMany({});
    await prisma.customer.deleteMany({});

    savedSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;

    await prisma.customer.create({
      data: { phone: CUSTOMER_PHONE, name: "Cron Tester" },
    });
  });

  afterAll(async () => {
    if (savedSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = savedSecret;

    await prisma.customerCredit.deleteMany({});
    await prisma.customer.deleteMany({});
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("401s without the cron secret", async () => {
    const res = await GET(cronRequest(false));
    expect(res.status).toBe(401);
  });

  it("fails closed when CRON_SECRET is unset or incorrect", async () => {
    delete process.env.CRON_SECRET;
    try {
      const response = await GET(cronRequest());
      expect(response.status).toBe(401);
      expect(JSON.stringify(await response.json())).not.toContain(CRON_SECRET);
    } finally {
      process.env.CRON_SECRET = CRON_SECRET;
    }
    const response = await GET(new NextRequest("http://localhost:3000/api/cron/reconcile", {
      headers: { authorization: "Bearer incorrect" },
    }));
    expect(response.status).toBe(401);
  });

  it("still promotes matured credits when there are 0 stuck transactions", async () => {
    const customer = await prisma.customer.findFirstOrThrow({
      where: { phone: CUSTOMER_PHONE },
    });
    const credit = await prisma.customerCredit.create({
      data: {
        customerId: customer.id,
        kind: "REFERRAL_COMMISSION",
        amount: 7000,
        status: "ACCRUED",
        payableAt: PAST,
      },
    });

    const res = await GET(cronRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats.totalFound).toBe(0);
    expect(data.creditPromotion).toEqual({ promoted: 1, failed: false });

    const after = await prisma.customerCredit.findUniqueOrThrow({
      where: { id: credit.id },
    });
    expect(after.status).toBe("PAYABLE");
  });

  it("marks a stuck MIDTRANS transaction EXPIRED on gateway 404 and still promotes", async () => {
    const txn = await createMockTransaction(prisma, {
      status: "PENDING",
      paymentType: "MIDTRANS",
    });
    await prisma.transaction.update({
      where: { id: txn.id },
      data: { createdAt: STUCK_AGE },
    });
    vi.mocked(getMidtransStatus).mockRejectedValueOnce({ httpStatusCode: 404 });

    const customer = await prisma.customer.findFirstOrThrow({
      where: { phone: CUSTOMER_PHONE },
    });
    await prisma.customerCredit.create({
      data: {
        customerId: customer.id,
        kind: "REFERRAL_COMMISSION",
        amount: 3000,
        status: "ACCRUED",
        payableAt: PAST,
      },
    });

    const res = await GET(cronRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats.totalFound).toBe(1);
    expect(data.stats.markedAsExpired).toBe(1);
    expect(data.creditPromotion).toEqual({ promoted: 1, failed: false });

    const after = await prisma.transaction.findUniqueOrThrow({
      where: { id: txn.id },
    });
    expect(after.status).toBe("EXPIRED");
  });

  it("reconciles a paid KASERA transaction via applyMidtransStatusUpdate", async () => {
    const txn = await createMockTransaction(prisma, {
      status: "PENDING",
      paymentType: "KASERA",
      qrCodeUrl: "kasera-payment-id-1",
    });
    await prisma.transaction.update({
      where: { id: txn.id },
      data: { createdAt: STUCK_AGE },
    });
    vi.mocked(getKaseraPaymentStatus).mockResolvedValueOnce({
      status: "succeeded",
    } as Awaited<ReturnType<typeof getKaseraPaymentStatus>>);

    const res = await GET(cronRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats.markedAsPaid).toBe(1);
    expect(applyMidtransStatusUpdate).toHaveBeenCalledWith(
      txn.orderId,
      "settlement"
    );
  });
});
