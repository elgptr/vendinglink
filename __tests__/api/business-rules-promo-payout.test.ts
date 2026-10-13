import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { accrueReferralCommission, REFERRAL_COMMISSION_FLOOR } from "@/lib/promo/accrual";
import { resolveRedeemCode } from "@/lib/promo/redeem";
import { GET as getReports } from "@/app/api/admin/reports/route";
import { GET as getPayoutSummary } from "@/app/api/admin/payout-batches/summary/route";
import { GET as getOrderStatus } from "@/app/api/customer/order/status/route";
import { cleanupTestDatabase, createMockProduct } from "../helpers/fixtures";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  requireAdminSession: vi.fn(),
}));

const REFERRER_PHONE = "6289911122233";
const REFEREE_PHONE = "6289944455566";
const REF_CODE = "REF-TEST-FLOOR";

describe("Business Rules & Refinements: Decisions 1 to 5", () => {
  let prisma: PrismaClient;
  let authMock: ReturnType<typeof vi.fn>;
  let referrerId: string;
  let refereeId: string;
  let referralCodeId: string;
  let productId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
    await prisma.customerCredit.deleteMany({});
    await prisma.referralRedemption.deleteMany({});
    await prisma.referralCode.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.voucherRule.deleteMany({});

    authMock = (await import("@/lib/auth")).auth as ReturnType<typeof vi.fn>;

    // Setup referrer customer with referral code
    const referrer = await prisma.customer.create({
      data: {
        phone: REFERRER_PHONE,
        name: "Budi Referrer",
        referralCode: {
          create: { code: REF_CODE },
        },
      },
      include: { referralCode: true },
    });
    referrerId = referrer.id;
    referralCodeId = referrer.referralCode!.id;

    // Setup referee customer
    const referee = await prisma.customer.create({
      data: {
        phone: REFEREE_PHONE,
        name: "Andi Referee",
      },
    });
    refereeId = referee.id;

    const prod = await createMockProduct(prisma, { price: 100000 });
    productId = prod.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { role: "ADMIN", username: "admin" } });
  });

  // ── Keputusan 1: Referee discount 5% & minSpend Rp 50.000 ──────────────────
  describe("Keputusan 1: Referee discount 5% & minSpend Rp 50.000", () => {
    let ruleId: string;

    beforeAll(async () => {
      const rule = await prisma.voucherRule.create({
        data: {
          code: "REFERRAL-NEW",
          name: "Diskon referee 5%",
          kind: "REFERRAL_NEW",
          discountType: "PERCENT",
          value: 5,
          minSpend: 50000,
          validFrom: new Date("2026-01-01T00:00:00Z"),
        },
      });
      ruleId = rule.id;
    });

    afterAll(async () => {
      await prisma.voucherRule.deleteMany({ where: { id: ruleId } });
    });

    it("menolak penggunaan kode jika belanja di bawah minSpend (misal Rp 30.000)", async () => {
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 30000,
        customerPhone: REFEREE_PHONE,
        customerName: "Andi Referee",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toMatch(/Minimal belanja Rp\s*50\.000/);
      }
    });

    it("memberikan diskon 5% saat belanja memenuhi minSpend (misal Rp 100.000 -> diskon Rp 5.000)", async () => {
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 100000,
        customerPhone: REFEREE_PHONE,
        customerName: "Andi Referee",
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.kind).toBe("REFERRAL");
        expect(res.discountAmount).toBe(5000); // 5% of 100.000
      }
    });
  });

  // ── Keputusan 2: Floor komisi Rp 100 ───────────────────────────────────────
  describe("Keputusan 2: Floor komisi referral Rp 100", () => {
    it("memastikan konstanta REFERRAL_COMMISSION_FLOOR bernilai 100", () => {
      expect(REFERRAL_COMMISSION_FLOOR).toBe(100);
    });

    it("memberikan komisi minimal Rp 100 saat transaksi bernilai Rp 0 (100% diskon)", async () => {
      const txn = await prisma.transaction.create({
        data: {
          orderId: `ORDER-ZERO-${Date.now()}`,
          productId,
          originalPrice: 50000,
          discountAmount: 50000,
          finalAmount: 0,
          paymentType: "FREE_PROMO",
          status: "PAID",
          stockStatus: "FULFILLED",
          paidAt: new Date(),
          customerId: refereeId,
        },
      });

      await prisma.referralRedemption.create({
        data: {
          referralCodeId,
          refereeCustomerId: refereeId,
          transactionId: txn.id,
          seq: 1,
        },
      });

      await prisma.$transaction(async (tx) => {
        await accrueReferralCommission(tx, txn.id);
      });

      const credit = await prisma.customerCredit.findFirstOrThrow({
        where: { sourceTxnId: txn.id, kind: "REFERRAL_COMMISSION" },
      });

      expect(credit.amount).toBe(100); // Floor Rp 100 diterapkan!
      expect(credit.status).toBe("ACCRUED");
      expect(credit.customerId).toBe(referrerId);
    });

    it("memberikan komisi minimal Rp 100 jika nominal komisi di bawah 100", async () => {
      // Belanja Rp 1.000 dengan komisi 5% -> dihitung Rp 50 (< 100)
      const txn = await prisma.transaction.create({
        data: {
          orderId: `ORDER-SMALL-${Date.now()}`,
          productId,
          originalPrice: 1000,
          discountAmount: 0,
          finalAmount: 1000,
          paymentType: "MIDTRANS",
          status: "PAID",
          stockStatus: "FULFILLED",
          paidAt: new Date(),
          customerId: refereeId,
        },
      });

      await prisma.referralRedemption.create({
        data: {
          referralCodeId,
          refereeCustomerId: refereeId,
          transactionId: txn.id,
          seq: 2,
        },
      });

      await prisma.$transaction(async (tx) => {
        await accrueReferralCommission(tx, txn.id);
      });

      const credit = await prisma.customerCredit.findFirstOrThrow({
        where: { sourceTxnId: txn.id, kind: "REFERRAL_COMMISSION" },
      });

      expect(credit.amount).toBe(100); // Floor Rp 100 diterapkan!
    });
  });

  // ── Keputusan 4: paymentType FREE_PROMO pada transaksi Rp 0 ──────────────
  describe("Keputusan 4: Audit trail & pelabelan paymentType FREE_PROMO", () => {
    it("mengizinkan lookup status transaksi dengan paymentType FREE_PROMO", async () => {
      const txn = await prisma.transaction.create({
        data: {
          orderId: `FREE-ORDER-${Date.now()}`,
          productId,
          originalPrice: 50000,
          discountAmount: 50000,
          finalAmount: 0,
          paymentType: "FREE_PROMO",
          status: "PAID",
          stockStatus: "FULFILLED",
          paidAt: new Date(),
        },
      });

      const req = new NextRequest(`http://localhost/api/customer/order/status?orderId=${txn.orderId}`);
      const res = await getOrderStatus(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("PAID");
      expect(json.paymentType).toBe("FREE_PROMO");
      expect(json.finalAmount).toBe(0);
    });
  });

  // ── Keputusan 3: Penyatuan sistem diskon di Laporan Penjualan ───────────────
  describe("Keputusan 3: Penyatuan dualisme diskon pada laporan admin", () => {
    it("menyajikan discountDetail terpadu dan paymentType pada GET /api/admin/reports", async () => {
      const req = new NextRequest("http://localhost/api/admin/reports?limit=10");
      const res = await getReports(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json.transactions)).toBe(true);
      const sample = json.transactions.find((t: { paymentType?: string }) => t.paymentType === "FREE_PROMO");
      expect(sample).toBeDefined();
      expect(sample.paymentType).toBe("FREE_PROMO");
    });
  });

  // ── Keputusan 5: Ekspektasi Payout Batch & Transparansi Kredit Referrer ─────
  describe("Keputusan 5: Transparansi kredit referrer pada payout summary", () => {
    it("mengembalikan konfigurasi, metrik global, dan daftar referrer dengan breakdown status", async () => {
      const req = new NextRequest("http://localhost/api/admin/payout-batches/summary");
      const res = await getPayoutSummary(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.config).toBeDefined();
      expect(json.config.minPayoutAmount).toBeGreaterThanOrEqual(20000);
      expect(json.config.accrualWindowDays).toBe(15);

      expect(json.metrics).toBeDefined();
      expect(typeof json.metrics.totalPayable).toBe("number");
      expect(typeof json.metrics.totalAccrued).toBe("number");

      expect(Array.isArray(json.referrers)).toBe(true);
      const ref = json.referrers.find((r: { phone: string }) => r.phone === REFERRER_PHONE);
      expect(ref).toBeDefined();
      expect(ref.referralCode).toBe(REF_CODE);
      expect(ref.accruedAmount).toBeGreaterThanOrEqual(100);
      expect(["READY", "BELOW_THRESHOLD", "WAITING_ACCRUAL", "ZERO_CREDIT"]).toContain(ref.eligibilityStatus);
    });
  });
});
