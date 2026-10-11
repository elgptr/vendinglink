import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/checkout/customer/route";
import { applyMidtransStatusUpdate } from "@/lib/transactionStatus";
import {
  createMockProduct,
  createMockStock,
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

// Gateways are never really called — checkout stops at token creation.
vi.mock("@/lib/midtrans", () => ({
  createSnapTransaction: vi.fn(async () => ({ token: "test-snap-token" })),
  getMidtransStatus: vi.fn(),
}));
vi.mock("@/lib/doku", () => ({ createDokuCheckout: vi.fn() }));
vi.mock("@/lib/kasera", () => ({
  createKaseraQrisPayment: vi.fn(),
  getKaseraPaymentStatus: vi.fn(),
}));
vi.mock("@/lib/paymentConfig", () => ({
  getActivePaymentGateway: () => "MIDTRANS",
}));
vi.mock("@/lib/suppliers", () => ({
  rezekiSupplier: {
    checkProductStock: vi.fn(),
    purchase: vi.fn(),
  },
}));
// Public checkout is CSRF-guarded; tests bypass the double-submit check.
vi.mock("@/lib/csrf", () => ({
  verifyCsrfRequest: () => true,
  extractCsrfTokens: () => ({ cookieToken: "t", submittedToken: "t" }),
}));
// WhatsApp notification fires on PAID — stub it out.
vi.mock("@/lib/whatsapp", () => ({
  sendPaymentNotification: vi.fn(async () => ({ sent: true, mode: "mock" })),
}));

const REFERRER_PHONE = "628222000001";
const REFEREE_PHONE = "628222000002";
const REF_CODE = "TCHECKREF00001";
const VOUCHER_CODE = "TCHECKVOC00001";
const COMMISSION_PCT = 10;
const ACCRUAL_DAYS = 15;
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);

let ipCounter = 0;
function postRequest(body: unknown) {
  ipCounter += 1;
  return new NextRequest("http://localhost:3000/api/checkout/customer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.9.1.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}
describe("api/checkout/customer — unified discountCode redeem (ST-2d)", () => {
  let prisma: PrismaClient;
  let referralRuleId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
    await prisma.referralCode.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.programConfig.deleteMany({});

    await prisma.programConfig.create({
      data: {
        referralCommissionPct: COMMISSION_PCT,
        refereeDiscountValue: 0,
        accrualWindowDays: ACCRUAL_DAYS,
      },
    });

    await prisma.customer.create({
      data: {
        phone: REFERRER_PHONE,
        name: "Dewi Anggraini",
        referralCode: { create: { code: REF_CODE } },
      },
    });

    const rule = await prisma.voucherRule.create({
      data: {
        code: "REFERRAL-NEW-C",
        name: "Referee discount",
        kind: "REFERRAL_NEW",
        discountType: "FIXED_IDR",
        value: 5000,
        validFrom: PAST,
      },
    });
    referralRuleId = rule.id;

    await prisma.voucherRule.create({
      data: {
        code: VOUCHER_CODE,
        name: "Checkout voucher",
        kind: "MANUAL",
        discountType: "FIXED_IDR",
        value: 10000,
        validFrom: PAST,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.referralCode.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.programConfig.deleteMany({});
    await prisma.$disconnect();
  });

  it("rejects a discountCode without a WhatsApp number", async () => {
    const product = await createMockProduct(prisma, { price: 50000 });
    await createMockStock(prisma, product.id, 1); // stock check runs before redeem
    const res = await POST(
      postRequest({
        productId: product.id,
        discountCode: REF_CODE,
        customerName: "No Phone Buyer",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Nomor WhatsApp");
  });

  it("rejects self-referral by phone match", async () => {
    const product = await createMockProduct(prisma, { price: 50000 });
    await createMockStock(prisma, product.id, 1);
    const res = await POST(
      postRequest({
        productId: product.id,
        discountCode: REF_CODE,
        customerName: "Dewi Anggraini",
        customerPhone: "08222000001", // normalizes to the referrer's phone
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("milik sendiri");
  });

  it("rejects an unknown code", async () => {
    const product = await createMockProduct(prisma, { price: 50000 });
    await createMockStock(prisma, product.id, 1);
    const res = await POST(
      postRequest({
        productId: product.id,
        discountCode: "TIDAKADAKODE",
        customerName: "Citra",
        customerPhone: "08222000002",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("tidak valid");
  });

  it("applies a referral code, records the redemption atomically, and accrues commission at PAID", async () => {
    const product = await createMockProduct(prisma, { price: 50000 });
    await createMockStock(prisma, product.id, 3);

    // ── First redemption (seq 1) ─────────────────────────────────────────
    const res = await POST(
      postRequest({
        productId: product.id,
        discountCode: REF_CODE,
        customerName: "Citra Lestari",
        customerPhone: "08222000002",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.amount).toBe(45000); // 50000 - 5000 referee discount
    expect(data.snapToken).toBe("test-snap-token");

    const txn = await prisma.transaction.findUniqueOrThrow({
      where: { orderId: data.orderId },
    });
    expect(txn.discountAmount).toBe(5000);
    expect(txn.finalAmount).toBe(45000);
    expect(txn.customerId).not.toBeNull();

    const redemption = await prisma.referralRedemption.findFirstOrThrow({
      where: { transactionId: txn.id },
    });
    expect(redemption.seq).toBe(1);

    const rule = await prisma.voucherRule.findUniqueOrThrow({
      where: { id: referralRuleId },
    });
    expect(rule.usedCount).toBe(1);

    // ── Settlement → referrer commission accrues (ACCRUED) ───────────────
    const settle = await applyMidtransStatusUpdate(data.orderId, "settlement", "accept");
    expect(settle.updated).toBe(true);

    // Re-fetch: paidAt is written by the settlement transaction.
    const paidTxn = await prisma.transaction.findUniqueOrThrow({
      where: { orderId: data.orderId },
    });
    expect(paidTxn.status).toBe("PAID");

    const credit = await prisma.customerCredit.findFirstOrThrow({
      where: { kind: "REFERRAL_COMMISSION", sourceTxnId: txn.id },
      include: { customer: true },
    });
    expect(credit.customer?.phone).toBe(REFERRER_PHONE);
    expect(credit.status).toBe("ACCRUED");
    expect(credit.amount).toBe(4500); // floor(45000 × 10%)
    expect(credit.appliedRatePct).toBe(COMMISSION_PCT); // snapshot
    const expectedPayable =
      paidTxn.paidAt!.getTime() + ACCRUAL_DAYS * 24 * 60 * 60 * 1000;
    // paidAt was set inside the same tx; allow a small drift.
    expect(Math.abs(credit.payableAt!.getTime() - expectedPayable)).toBeLessThan(5000);

    // ── Second redemption by the same referee (seq 2) ────────────────────
    const res2 = await POST(
      postRequest({
        productId: product.id,
        discountCode: REF_CODE,
        customerName: "Citra Lestari",
        customerPhone: "08222000002",
      })
    );
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    const txn2 = await prisma.transaction.findUniqueOrThrow({
      where: { orderId: data2.orderId },
    });
    const redemption2 = await prisma.referralRedemption.findFirstOrThrow({
      where: { transactionId: txn2.id },
    });
    expect(redemption2.seq).toBe(2);

    // ── Third redemption → 400 (B4: max 2 per code+referee) ─────────────
    const res3 = await POST(
      postRequest({
        productId: product.id,
        discountCode: REF_CODE,
        customerName: "Citra Lestari",
        customerPhone: "08222000002",
      })
    );
    expect(res3.status).toBe(400);
    const data3 = await res3.json();
    expect(data3.error).toContain("batas pemakaian");
  });

  it("applies a voucher rule code and records a VoucherRedemption", async () => {
    const product = await createMockProduct(prisma, { price: 50000 });
    await createMockStock(prisma, product.id, 1);
    const res = await POST(
      postRequest({
        productId: product.id,
        discountCode: VOUCHER_CODE,
        customerName: "Voucher Buyer",
        customerPhone: "08222000003",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.amount).toBe(40000); // 50000 - 10000

    const txn = await prisma.transaction.findUniqueOrThrow({
      where: { orderId: data.orderId },
    });
    const redemption = await prisma.voucherRedemption.findFirstOrThrow({
      where: { transactionId: txn.id },
    });
    expect(redemption.seq).toBe(1);

    const rule = await prisma.voucherRule.findUniqueOrThrow({
      where: { code: VOUCHER_CODE },
    });
    expect(rule.usedCount).toBe(1);
  });
});

