import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/discount/validate/route";
import { cleanupTestDatabase } from "../helpers/fixtures";

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
function postRequest(body: unknown, ip?: string) {
  ipCounter += 1;
  return new NextRequest("http://localhost:3000/api/discount/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip ?? `10.8.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

describe("api/discount/validate (ST-2a-2 consolidated endpoint)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);

    // Single-use promo codes (stockout refund semantics)
    await prisma.promoCode.create({
      data: { code: "TDV-VALID", discount: 25000 },
    });
    await prisma.promoCode.create({
      data: { code: "TDV-USED", discount: 25000, usedAt: new Date() },
    });
    await prisma.promoCode.create({
      data: {
        code: "TDV-EXPIRED",
        discount: 25000,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    // Quota vouchers
    await prisma.voucher.create({
      data: { code: "TDV-VOUCHER", discountAmount: 10000, quota: 5 },
    });
    await prisma.voucher.create({
      data: { code: "TDV-FULL", discountAmount: 10000, quota: 1, usedCount: 1 },
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("validates an active promo code", async () => {
    const res = await POST(postRequest({ code: "TDV-VALID" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.promoCodeId).toBeDefined();
    expect(data.discountAmount).toBe(25000);
  });

  it("rejects an already-used promo code", async () => {
    const res = await POST(postRequest({ code: "TDV-USED" }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain("sudah digunakan");
  });

  it("rejects an expired promo code", async () => {
    const res = await POST(postRequest({ code: "TDV-EXPIRED" }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain("kadaluarsa");
  });

  it("validates a voucher with remaining quota", async () => {
    const res = await POST(postRequest({ code: "TDV-VOUCHER" }));
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.voucherId).toBeDefined();
    expect(data.discountAmount).toBe(10000);
  });

  it("rejects a voucher whose quota is exhausted", async () => {
    const res = await POST(postRequest({ code: "TDV-FULL" }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain("Kuota");
  });

  it("enforces product scoping when productId is provided", async () => {
    const product = await prisma.product.create({
      data: { name: "TDV Scoped Product", price: 50000 },
    });
    const other = await prisma.product.create({
      data: { name: "TDV Other Product", price: 50000 },
    });
    await prisma.voucher.create({
      data: {
        code: "TDV-SCOPED",
        discountAmount: 5000,
        quota: 5,
        applicableProducts: { connect: [{ id: product.id }] },
      },
    });

    const wrongProduct = await POST(
      postRequest({ code: "TDV-SCOPED", productId: other.id })
    );
    expect((await wrongProduct.json()).valid).toBe(false);

    const rightProduct = await POST(
      postRequest({ code: "TDV-SCOPED", productId: product.id })
    );
    const data = await rightProduct.json();
    expect(data.valid).toBe(true);
    expect(data.discountAmount).toBe(5000);
  });

  it("rejects an unknown code", async () => {
    const res = await POST(postRequest({ code: "TDV-NOPE" }));
    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  it("400s on invalid body", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("rate limits repeated attempts from the same IP", async () => {
    const ip = "10.8.99.1";
    for (let i = 0; i < 10; i++) {
      const res = await POST(postRequest({ code: "TDV-VALID" }, ip));
      expect(res.status).toBe(200);
    }
    const res = await POST(postRequest({ code: "TDV-VALID" }, ip));
    expect(res.status).toBe(429);
  });

  // ── New promo/referral engine (ST-2d, B5) ────────────────────────────────
  describe("new engine: ReferralCode → VoucherRule", () => {
    const TDV_REF_CODE = "TDVREFCODE0001";
    const TDV_REFERRER_PHONE = "628333000001";
    let productId: string;

    beforeAll(async () => {
      const product = await prisma.product.create({
        data: { name: "TDV Engine Product", price: 50000 },
      });
      productId = product.id;

      await prisma.voucherRule.create({
        data: {
          code: "REFERRAL-NEW-V",
          name: "Referee discount",
          kind: "REFERRAL_NEW",
          discountType: "FIXED_IDR",
          value: 5000,
          validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      await prisma.voucherRule.create({
        data: {
          code: "TDV-RULE",
          name: "Engine voucher",
          kind: "MANUAL",
          discountType: "FIXED_IDR",
          value: 10000,
          validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      await prisma.customer.create({
        data: {
          phone: TDV_REFERRER_PHONE,
          name: "Engine Referrer",
          referralCode: { create: { code: TDV_REF_CODE } },
        },
      });
    });

    afterAll(async () => {
      await prisma.referralCode.deleteMany({});
      await prisma.customer.deleteMany({});
    });

    it("validates a referral code and returns redeemCode for checkout", async () => {
      const res = await POST(
        postRequest({ code: TDV_REF_CODE, productId, customerPhone: "08333000002" })
      );
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.kind).toBe("REFERRAL");
      expect(data.redeemCode).toBe(TDV_REF_CODE);
      expect(data.discountAmount).toBe(5000);
    });

    it("validates a voucher rule code", async () => {
      const res = await POST(
        postRequest({ code: "TDV-RULE", productId, customerPhone: "08333000002" })
      );
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.kind).toBe("VOUCHER_RULE");
      expect(data.redeemCode).toBe("TDV-RULE");
      expect(data.discountAmount).toBe(10000);
    });

    it("rejects self-referral when the referee phone matches the referrer", async () => {
      const res = await POST(
        postRequest({ code: TDV_REF_CODE, productId, customerPhone: "08333000001" })
      );
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.error).toContain("milik sendiri");
    });

    it("rejects an unknown code even with a productId", async () => {
      const res = await POST(postRequest({ code: "TDV-UNKNOWN", productId }));
      const data = await res.json();
      expect(data.valid).toBe(false);
    });
  });
});
