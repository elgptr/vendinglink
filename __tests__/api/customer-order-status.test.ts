import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/customer/order/status/route";
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

// Gateway SDKs are only invoked for PENDING reconciliation; stub them so the
// module import never touches real credentials in tests.
vi.mock("@/lib/midtrans", () => ({ getMidtransStatus: vi.fn() }));
vi.mock("@/lib/kasera", () => ({ getKaseraPaymentStatus: vi.fn() }));

const TEST_PHONE = "081298760001";
const TEST_PHONE_NORMALIZED = "6281298760001";
const TEST_REF_CODE = "TSTATREF00001";
const TEST_PCT = 7;

function getRequest(orderId: string) {
  return new NextRequest(
    `http://localhost:3000/api/customer/order/status?orderId=${encodeURIComponent(orderId)}`,
    { method: "GET" }
  );
}

describe("api/customer/order/status — referral info (ST-2c-2)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);

    // Deterministic ProgramConfig singleton for the pct assertion.
    await prisma.programConfig.deleteMany({});
    await prisma.programConfig.create({
      data: { referralCommissionPct: TEST_PCT },
    });

    // Customer with a referral code (normalized phone, as written by
    // upsertCustomer at checkout).
    await prisma.customer.create({
      data: {
        phone: TEST_PHONE_NORMALIZED,
        name: "Status Test Customer",
        referralCode: { create: { code: TEST_REF_CODE } },
      },
    });
  });

  afterAll(async () => {
    await prisma.referralCode.deleteMany({ where: { code: TEST_REF_CODE } });
    await prisma.customer.deleteMany({ where: { phone: TEST_PHONE_NORMALIZED } });
    await prisma.programConfig.deleteMany({});
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("returns referralCode + live ProgramConfig pct for a PAID order", async () => {
    const product = await createMockProduct(prisma);
    const txn = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PAID",
      customerPhone: TEST_PHONE, // mixed format — normalized at lookup
      redeemUrl: "https://example.com/redeem/xyz",
    });

    const res = await GET(getRequest(txn.orderId));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.status).toBe("PAID");
    expect(data.referralCode).toBe(TEST_REF_CODE);
    expect(data.referralCommissionPct).toBe(TEST_PCT);
  });

  it("returns null referral fields while the order is still PENDING", async () => {
    const product = await createMockProduct(prisma);
    const txn = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PENDING",
      paymentType: "DOKU", // DOKU skips the Midtrans/Kasera reconciliation calls
      customerPhone: TEST_PHONE,
    });

    const res = await GET(getRequest(txn.orderId));
    const data = await res.json();

    expect(data.status).toBe("PENDING");
    expect(data.referralCode).toBeNull();
    expect(data.referralCommissionPct).toBeNull();
  });

  it("returns null referral fields when no Customer matches the phone", async () => {
    const product = await createMockProduct(prisma);
    const txn = await createMockTransaction(prisma, {
      productId: product.id,
      status: "PAID",
      customerPhone: "081299990002",
      redeemUrl: "https://example.com/redeem/abc",
    });

    const res = await GET(getRequest(txn.orderId));
    const data = await res.json();

    expect(data.status).toBe("PAID");
    expect(data.referralCode).toBeNull();
    expect(data.referralCommissionPct).toBeNull();
  });
});
