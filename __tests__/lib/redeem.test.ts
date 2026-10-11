import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  resolveRedeemCode,
  recordRedemption,
  computeRuleDiscount,
  normalizedNameSimilarity,
  RedeemQuotaError,
  REFERRAL_MAX_REDEMPTIONS_PER_REFEREE,
} from "@/lib/promo/redeem";
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

const REFERRER_PHONE = "628111000001";
const REFEREE_PHONE = "628111000002";
const REF_CODE = "TREDEEMREF0001";
const VOUCHER_CODE = "TREDEEMVOC0001";
const REFEREE_DISCOUNT_FALLBACK = 3000;

const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("lib/promo/redeem (ST-2d)", () => {
  let prisma: PrismaClient;
  let referralCodeId: string;
  let referralRuleId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
    // cleanupTestDatabase doesn't touch these — clear leftovers from prior runs.
    await prisma.referralCode.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.programConfig.deleteMany({});

    await prisma.programConfig.create({
      data: {
        referralCommissionPct: 10,
        refereeDiscountValue: REFEREE_DISCOUNT_FALLBACK,
        accrualWindowDays: 15,
      },
    });

    const referrer = await prisma.customer.create({
      data: {
        phone: REFERRER_PHONE,
        name: "Budi Santoso",
        referralCode: { create: { code: REF_CODE } },
      },
      include: { referralCode: true },
    });
    referralCodeId = referrer.referralCode!.id;

    await prisma.customer.create({
      data: { phone: REFEREE_PHONE, name: "Citra Lestari" },
    });

    const rule = await prisma.voucherRule.create({
      data: {
        code: "REFERRAL-NEW-T",
        name: "Test referee discount",
        kind: "REFERRAL_NEW",
        discountType: "FIXED_IDR",
        value: 5000,
        validFrom: PAST,
      },
    });
    referralRuleId = rule.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.referralCode.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.programConfig.deleteMany({});
    await prisma.$disconnect();
  });

  // Restore the shared REFERRAL_NEW rule to its happy-path shape.
  async function resetReferralRule() {
    await prisma.voucherRule.update({
      where: { id: referralRuleId },
      data: {
        kind: "REFERRAL_NEW",
        discountType: "FIXED_IDR",
        value: 5000,
        maxDiscount: null,
        minSpend: 0,
        validFrom: PAST,
        validUntil: null,
        quotaTotal: null,
        usedCount: 0,
        isActive: true,
        categoryId: null,
      },
    });
  }

  async function recreateReferralRule() {
    const recreated = await prisma.voucherRule.create({
      data: {
        code: "REFERRAL-NEW-T",
        name: "Test referee discount",
        kind: "REFERRAL_NEW",
        discountType: "FIXED_IDR",
        value: 5000,
        validFrom: PAST,
      },
    });
    referralRuleId = recreated.id;
  }
  describe("referral path", () => {
    it("resolves a referral code with the REFERRAL_NEW rule discount", async () => {
      await resetReferralRule();
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: REFEREE_PHONE,
        customerName: "Citra Lestari",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.kind).toBe("REFERRAL");
        expect(res.discountAmount).toBe(5000);
        if (res.kind === "REFERRAL") expect(res.ruleId).toBe(referralRuleId);
      }
    });

    it("applies PERCENT discount capped by maxDiscount", async () => {
      await resetReferralRule();
      await prisma.voucherRule.update({
        where: { id: referralRuleId },
        data: { discountType: "PERCENT", value: 50, maxDiscount: 8000 },
      });
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000, // 50% = 25000 → capped to 8000
        customerPhone: REFEREE_PHONE,
      });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.discountAmount).toBe(8000);
    });

    it("falls back to ProgramConfig.refereeDiscountValue when no REFERRAL_NEW rule exists", async () => {
      await prisma.voucherRule.delete({ where: { id: referralRuleId } });
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: REFEREE_PHONE,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.discountAmount).toBe(REFEREE_DISCOUNT_FALLBACK);
        if (res.kind === "REFERRAL") expect(res.ruleId).toBeNull();
      }
      await recreateReferralRule();
    });

    it("rejects when no rule exists and refereeDiscountValue is 0", async () => {
      await prisma.voucherRule.delete({ where: { id: referralRuleId } });
      await prisma.programConfig.updateMany({
        data: { refereeDiscountValue: 0 },
      });
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: REFEREE_PHONE,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("benefit referral");
      await prisma.programConfig.updateMany({
        data: { refereeDiscountValue: REFEREE_DISCOUNT_FALLBACK },
      });
      await recreateReferralRule();
    });

    it("enforces sequential rule guards (aktif → window → minSpend → kuota total)", async () => {
      // isActive
      await resetReferralRule();
      await prisma.voucherRule.update({
        where: { id: referralRuleId },
        data: { isActive: false },
      });
      let res = await resolveRedeemCode({ prisma, code: REF_CODE, amount: 50000 });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("tidak aktif");

      // window: not yet started
      await resetReferralRule();
      await prisma.voucherRule.update({
        where: { id: referralRuleId },
        data: { validFrom: FUTURE },
      });
      res = await resolveRedeemCode({ prisma, code: REF_CODE, amount: 50000 });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("belum berlaku");

      // window: expired
      await resetReferralRule();
      await prisma.voucherRule.update({
        where: { id: referralRuleId },
        data: { validUntil: PAST },
      });
      res = await resolveRedeemCode({ prisma, code: REF_CODE, amount: 50000 });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("kedaluwarsa");

      // minSpend
      await resetReferralRule();
      await prisma.voucherRule.update({
        where: { id: referralRuleId },
        data: { minSpend: 100000 },
      });
      res = await resolveRedeemCode({ prisma, code: REF_CODE, amount: 50000 });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("Minimal belanja");

      // kuota total
      await resetReferralRule();
      await prisma.voucherRule.update({
        where: { id: referralRuleId },
        data: { quotaTotal: 1, usedCount: 1 },
      });
      res = await resolveRedeemCode({ prisma, code: REF_CODE, amount: 50000 });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("Kuota promo sudah habis");

      await resetReferralRule();
    });

    it("rejects after the referee already redeemed the code twice (B4)", async () => {
      await resetReferralRule();
      const referee = await prisma.customer.findUniqueOrThrow({
        where: { phone: REFEREE_PHONE },
      });
      for (let seq = 1; seq <= REFERRAL_MAX_REDEMPTIONS_PER_REFEREE; seq++) {
        await prisma.referralRedemption.create({
          data: {
            referralCodeId,
            refereeCustomerId: referee.id,
            transactionId: `tx-cap-${seq}-${Date.now()}`,
            seq,
          },
        });
      }

      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: REFEREE_PHONE,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("batas pemakaian");

      await prisma.referralRedemption.deleteMany({ where: { referralCodeId } });
    });

    it("rejects self-referral by phone match (hard reject)", async () => {
      await resetReferralRule();
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: "08111000001", // normalizes to the referrer's 628xxx
        customerName: "Someone Else",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("milik sendiri");
    });

    it("rejects self-referral by name similarity ≥ 0.9 (independent OR)", async () => {
      await resetReferralRule();
      // Different phone (no Customer row) so only the name guard can fire.
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: "081119999999",
        customerName: "budi  santoso", // case/spacing-insensitive match
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("milik sendiri");
    });

    it("allows a referee with a different phone and dissimilar name", async () => {
      await resetReferralRule();
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: "081119999999",
        customerName: "Rina Marlina",
      });
      expect(res.ok).toBe(true);
    });

    it("resolves ReferralCode before VoucherRule when both share a code (B5)", async () => {
      await resetReferralRule();
      const collision = await prisma.voucherRule.create({
        data: {
          code: REF_CODE,
          name: "Collision voucher",
          kind: "MANUAL",
          discountType: "FIXED_IDR",
          value: 99999,
          validFrom: PAST,
        },
      });
      const res = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: REFEREE_PHONE,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.kind).toBe("REFERRAL");
        expect(res.discountAmount).toBe(5000); // not the voucher's 99999
      }
      await prisma.voucherRule.delete({ where: { id: collision.id } });
    });
  });

  describe("voucher rule path", () => {
    it("resolves a MANUAL voucher rule with a FIXED_IDR discount", async () => {
      await resetReferralRule();
      const rule = await prisma.voucherRule.create({
        data: {
          code: VOUCHER_CODE,
          name: "Test voucher",
          kind: "MANUAL",
          discountType: "FIXED_IDR",
          value: 10000,
          validFrom: PAST,
        },
      });
      const res = await resolveRedeemCode({
        prisma,
        code: VOUCHER_CODE,
        amount: 50000,
        customerPhone: REFEREE_PHONE,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.kind).toBe("VOUCHER_RULE");
        expect(res.discountAmount).toBe(10000);
      }
      await prisma.voucherRule.delete({ where: { id: rule.id } });
    });

    it("enforces quotaPerCustomer via existing VoucherRedemption rows", async () => {
      await resetReferralRule();
      const rule = await prisma.voucherRule.create({
        data: {
          code: `${VOUCHER_CODE}-Q`,
          name: "Quota voucher",
          kind: "MANUAL",
          discountType: "FIXED_IDR",
          value: 10000,
          validFrom: PAST,
          quotaPerCustomer: 1,
        },
      });
      const referee = await prisma.customer.findUniqueOrThrow({
        where: { phone: REFEREE_PHONE },
      });
      await prisma.voucherRedemption.create({
        data: {
          ruleId: rule.id,
          customerId: referee.id,
          transactionId: `tx-vq-${Date.now()}`,
          seq: 1,
        },
      });

      const res = await resolveRedeemCode({
        prisma,
        code: `${VOUCHER_CODE}-Q`,
        amount: 50000,
        customerPhone: REFEREE_PHONE,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("batas pemakaian");
      await prisma.voucherRule.delete({ where: { id: rule.id } });
    });

    it("rejects a category-scoped rule for a product in another category", async () => {
      await resetReferralRule();
      const category = await prisma.category.create({
        data: { name: `Test Cat ${Date.now()}`, slug: `test-cat-${Date.now()}` },
      });
      const rule = await prisma.voucherRule.create({
        data: {
          code: `${VOUCHER_CODE}-C`,
          name: "Category voucher",
          kind: "MANUAL",
          discountType: "FIXED_IDR",
          value: 10000,
          validFrom: PAST,
          categoryId: category.id,
        },
      });

      // Mismatched category → rejected
      let res = await resolveRedeemCode({
        prisma,
        code: `${VOUCHER_CODE}-C`,
        amount: 50000,
        productCategoryId: null,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("tidak berlaku untuk produk");

      // Matching category → accepted
      res = await resolveRedeemCode({
        prisma,
        code: `${VOUCHER_CODE}-C`,
        amount: 50000,
        productCategoryId: category.id,
      });
      expect(res.ok).toBe(true);

      await prisma.voucherRule.delete({ where: { id: rule.id } });
    });

    it("never redeems a REFERRAL_NEW rule directly by its code", async () => {
      await resetReferralRule();
      const res = await resolveRedeemCode({
        prisma,
        code: "REFERRAL-NEW-T", // the governing rule's own code
        amount: 50000,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toContain("tidak valid");
    });
  });

  describe("recordRedemption (atomic quota enforcement)", () => {
    it("claims referral seq 1..2, then rejects the third redemption", async () => {
      await resetReferralRule();
      const referee = await prisma.customer.findUniqueOrThrow({
        where: { phone: REFEREE_PHONE },
      });
      const resolution = await resolveRedeemCode({
        prisma,
        code: REF_CODE,
        amount: 50000,
        customerPhone: REFEREE_PHONE,
      });
      if (!resolution.ok) throw new Error("expected resolution to succeed");

      // seq 1 + seq 2 succeed across separate orders
      for (let i = 1; i <= REFERRAL_MAX_REDEMPTIONS_PER_REFEREE; i++) {
        await prisma.$transaction(async (tx) => {
          await recordRedemption(tx, resolution, `tx-seq-${i}-${Date.now()}`, referee.id);
        });
      }
      const rows = await prisma.referralRedemption.findMany({
        where: { referralCodeId, refereeCustomerId: referee.id },
        orderBy: { seq: "asc" },
      });
      expect(rows.map((r) => r.seq)).toEqual([1, 2]);

      // Governing rule's usedCount tracked both redemptions
      const rule = await prisma.voucherRule.findUniqueOrThrow({
        where: { id: referralRuleId },
      });
      expect(rule.usedCount).toBe(2);

      // Third → all seq values taken → RedeemQuotaError
      await expect(
        prisma.$transaction(async (tx) => {
          await recordRedemption(tx, resolution, `tx-seq-3-${Date.now()}`, referee.id);
        })
      ).rejects.toBeInstanceOf(RedeemQuotaError);

      await prisma.referralRedemption.deleteMany({ where: { referralCodeId } });
      await resetReferralRule();
    });

    it("enforces quotaTotal atomically even when a per-customer seq is free", async () => {
      await resetReferralRule();
      const referee = await prisma.customer.findUniqueOrThrow({
        where: { phone: REFEREE_PHONE },
      });
      const rule = await prisma.voucherRule.create({
        data: {
          code: `${VOUCHER_CODE}-T`,
          name: "Total quota voucher",
          kind: "MANUAL",
          discountType: "FIXED_IDR",
          value: 10000,
          validFrom: PAST,
          quotaTotal: 1,
          usedCount: 1, // already exhausted globally
        },
      });

      await expect(
        prisma.$transaction(async (tx) => {
          await recordRedemption(
            tx,
            {
              ok: true,
              kind: "VOUCHER_RULE",
              code: rule.code,
              ruleId: rule.id,
              quotaPerCustomer: 1,
              discountAmount: 10000,
            },
            `tx-tq-${Date.now()}`,
            referee.id
          );
        })
      ).rejects.toBeInstanceOf(RedeemQuotaError);

      // The failed redemption must not leave a VoucherRedemption row behind
      // (thrown inside $transaction → rolled back).
      const count = await prisma.voucherRedemption.count({
        where: { ruleId: rule.id },
      });
      expect(count).toBe(0);

      await prisma.voucherRule.delete({ where: { id: rule.id } });
    });
  });

  describe("pure helpers", () => {
    it("computeRuleDiscount handles FIXED, PERCENT, maxDiscount and amount cap", () => {
      expect(
        computeRuleDiscount({ discountType: "FIXED_IDR", value: 5000, maxDiscount: null }, 50000)
      ).toBe(5000);
      expect(
        computeRuleDiscount({ discountType: "PERCENT", value: 10, maxDiscount: null }, 50000)
      ).toBe(5000);
      expect(
        computeRuleDiscount({ discountType: "PERCENT", value: 50, maxDiscount: 8000 }, 50000)
      ).toBe(8000);
      // Discount never exceeds the order amount
      expect(
        computeRuleDiscount({ discountType: "FIXED_IDR", value: 60000, maxDiscount: null }, 50000)
      ).toBe(50000);
    });

    it("normalizedNameSimilarity is normalization-insensitive", () => {
      expect(normalizedNameSimilarity("Budi Santoso", "budi santoso")).toBe(1);
      expect(normalizedNameSimilarity("Budi  Santoso", "Budi Santoso")).toBe(1);
      expect(normalizedNameSimilarity("Budi Santoso", "Budi Santosa")).toBeGreaterThanOrEqual(0.9);
      expect(normalizedNameSimilarity("Budi Santoso", "Citra Lestari")).toBeLessThan(0.9);
      expect(normalizedNameSimilarity("", "Budi")).toBe(0);
    });
  });
});

