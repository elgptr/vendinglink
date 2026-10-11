import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { normalizePhone } from "@/lib/phone";
import { formatRupiah } from "@/lib/utils";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "promo-redeem" });

type Db = Prisma.TransactionClient | PrismaClient;

// B4: a referral code can be redeemed at most twice by the same referee,
// enforced atomically via @@unique([referralCodeId, refereeCustomerId, seq]).
export const REFERRAL_MAX_REDEMPTIONS_PER_REFEREE = 2;

// Self-referral guard: normalized-name Levenshtein similarity at or above this
// threshold is rejected (and flagged for admin review via the warn log).
const SELF_REFERRAL_NAME_SIMILARITY_THRESHOLD = 0.9;

/** Thrown when an atomic quota guard fails inside the checkout transaction. */
export class RedeemQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedeemQuotaError";
  }
}

export type RedeemResolution =
  | {
      ok: true;
      kind: "REFERRAL";
      code: string;
      referralCodeId: string;
      // Governing REFERRAL_NEW VoucherRule, or null when the discount comes
      // from the ProgramConfig.refereeDiscountValue fallback.
      ruleId: string | null;
      discountAmount: number;
    }
  | {
      ok: true;
      kind: "VOUCHER_RULE";
      code: string;
      ruleId: string;
      quotaPerCustomer: number;
      discountAmount: number;
    }
  | { ok: false; error: string };

export interface ResolveRedeemInput {
  prisma: Db;
  code: string;
  // Order subtotal before discount (single-product checkout: product price).
  // Basis for the minSpend guard and PERCENT discounts.
  amount: number;
  // undefined = product context unknown (preview without productId — category
  // guard skipped); null = product has no category (mismatch if the rule is
  // category-scoped).
  productCategoryId?: string | null;
  // Referee identity. Optional for preview; the checkout path always passes it
  // (per-customer quota + self-referral guards need it).
  customerPhone?: string | null;
  customerName?: string | null;
}

interface RuleDiscountShape {
  discountType: string;
  value: number;
  maxDiscount: number | null;
}

export function computeRuleDiscount(
  rule: RuleDiscountShape,
  amount: number
): number {
  let discount: number;
  if (rule.discountType === "PERCENT") {
    discount = Math.floor((amount * rule.value) / 100);
    if (rule.maxDiscount != null)
      discount = Math.min(discount, rule.maxDiscount);
  } else {
    discount = rule.value;
  }
  return Math.max(0, Math.min(discount, amount));
}

interface RuleGuardShape extends RuleDiscountShape {
  isActive: boolean;
  validFrom: Date;
  validUntil: Date | null;
  minSpend: number;
  quotaTotal: number | null;
  usedCount: number;
  categoryId: string | null;
}

// Sequential guards per ROADMAP §5 Item 2: rule aktif → window UTC → minSpend
// → (category scope) → kuota total. Kuota per-customer and self-referral are
// checked separately by the caller because they need the referee identity.
// Returns an Indonesian error message on failure, null when usable.
function checkRuleGuards(
  rule: RuleGuardShape,
  amount: number,
  now: Date,
  productCategoryId?: string | null
): string | null {
  if (!rule.isActive) return "Kode promo sedang tidak aktif";
  // All windows are stored and evaluated in UTC (Date comparisons are
  // timezone-safe because JS Dates are absolute instants).
  if (rule.validFrom > now) return "Kode promo belum berlaku";
  if (rule.validUntil && rule.validUntil <= now)
    return "Kode promo sudah kedaluwarsa";
  if (amount < rule.minSpend)
    return `Minimal belanja ${formatRupiah(rule.minSpend)} untuk menggunakan kode ini`;
  if (
    rule.categoryId &&
    productCategoryId !== undefined &&
    rule.categoryId !== productCategoryId
  )
    return "Kode promo tidak berlaku untuk produk ini";
  if (rule.quotaTotal != null && rule.usedCount >= rule.quotaTotal)
    return "Kuota promo sudah habis";
  return null;
}
function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\p{ASCII}\s]/gu, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[n];
}

/** Levenshtein similarity of two names after normalization, in [0, 1]. */
export function normalizedNameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  return 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Resolve a code entered in the single checkout discount field (B5).
 *
 * Resolution order: ReferralCode → VoucherRule.code. Read-only: this checks
 * guards and computes the discount, but records nothing — the checkout path
 * must call recordRedemption() inside the order-creation transaction, which
 * re-enforces the quota guards atomically.
 */
export async function resolveRedeemCode(
  input: ResolveRedeemInput
): Promise<RedeemResolution> {
  const { prisma, amount, productCategoryId } = input;
  const code = input.code.trim().toUpperCase();
  const now = new Date();

  const normalizedPhone = input.customerPhone
    ? normalizePhone(input.customerPhone)
    : null;
  const refereeCustomer = normalizedPhone
    ? await prisma.customer.findUnique({
        where: { phone: normalizedPhone },
        select: { id: true },
      })
    : null;

  // ── 1) ReferralCode (B5: referral resolves before voucher rules) ────────
  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
    include: { customer: { select: { phone: true, name: true } } },
  });

  if (referralCode) {
    // Referee discount is governed by the active REFERRAL_NEW VoucherRule
    // (acceptance criterion); when no such rule exists, fall back to the flat
    // ProgramConfig.refereeDiscountValue.
    const rule = await prisma.voucherRule.findFirst({
      where: { kind: "REFERRAL_NEW" },
      orderBy: { createdAt: "asc" },
    });

    let ruleId: string | null = null;
    let discountAmount: number;

    if (rule) {
      const guardError = checkRuleGuards(rule, amount, now, productCategoryId);
      if (guardError) return { ok: false, error: guardError };
      ruleId = rule.id;
      discountAmount = computeRuleDiscount(rule, amount);
    } else {
      const config = await prisma.programConfig.findFirst({
        orderBy: { createdAt: "asc" },
      });
      discountAmount = Math.min(config?.refereeDiscountValue ?? 0, amount);
    }

    if (discountAmount <= 0) {
      return {
        ok: false,
        error: "Tidak ada benefit referral yang aktif saat ini",
      };
    }

    // Kuota per-customer: max 2 redemptions per (code, referee) (B4).
    if (refereeCustomer) {
      const used = await prisma.referralRedemption.count({
        where: {
          referralCodeId: referralCode.id,
          refereeCustomerId: refereeCustomer.id,
        },
      });
      if (used >= REFERRAL_MAX_REDEMPTIONS_PER_REFEREE) {
        return {
          ok: false,
          error:
            "Kode referral ini sudah mencapai batas pemakaian untuk nomor Anda",
        };
      }
    }

    // Self-referral: two INDEPENDENT conditions (OR, not AND).
    // (a) phone match — phone is UNIQUE, so same phone = same person by
    //     definition; hard reject.
    if (normalizedPhone && normalizedPhone === referralCode.customer.phone) {
      return {
        ok: false,
        error: "Tidak dapat menggunakan kode referral milik sendiri",
      };
    }
    // (b) normalized name similarity ≥ 0.9 — reject + flag for admin review.
    if (input.customerName && referralCode.customer.name) {
      const similarity = normalizedNameSimilarity(
        input.customerName,
        referralCode.customer.name
      );
      if (similarity >= SELF_REFERRAL_NAME_SIMILARITY_THRESHOLD) {
        log.warn(
          "Self-referral blocked by name similarity — flag for admin review",
          {
            referralCode: code,
            refereeName: input.customerName,
            referrerName: referralCode.customer.name,
            similarity: similarity.toFixed(3),
          }
        );
        return {
          ok: false,
          error: "Tidak dapat menggunakan kode referral milik sendiri",
        };
      }
    }

    return {
      ok: true,
      kind: "REFERRAL",
      code,
      referralCodeId: referralCode.id,
      ruleId,
      discountAmount,
    };
  }

  // ── 2) VoucherRule.code ─────────────────────────────────────────────────
  // REFERRAL_NEW rules never redeem directly — they only govern the discount
  // granted through a ReferralCode above.
  const rule = await prisma.voucherRule.findFirst({
    where: { code, kind: { not: "REFERRAL_NEW" } },
  });
  if (!rule) {
    return { ok: false, error: "Kode promo atau referral tidak valid" };
  }

  const guardError = checkRuleGuards(rule, amount, now, productCategoryId);
  if (guardError) return { ok: false, error: guardError };

  // Kuota per-customer via VoucherRedemption count (the atomic enforcement
  // happens in recordRedemption via the unique seq constraint).
  if (refereeCustomer) {
    const used = await prisma.voucherRedemption.count({
      where: { ruleId: rule.id, customerId: refereeCustomer.id },
    });
    if (used >= rule.quotaPerCustomer) {
      return {
        ok: false,
        error: "Anda sudah mencapai batas pemakaian kode ini",
      };
    }
  }

  const discountAmount = computeRuleDiscount(rule, amount);
  if (discountAmount <= 0) {
    return { ok: false, error: "Kode promo tidak memberikan potongan" };
  }

  return {
    ok: true,
    kind: "VOUCHER_RULE",
    code,
    ruleId: rule.id,
    quotaPerCustomer: rule.quotaPerCustomer,
    discountAmount,
  };
}

// Atomic quota-total guard + usage increment in one statement — no racy
// read-then-write. Throws RedeemQuotaError when the quota is already exhausted.
async function incrementRuleUsage(
  tx: Prisma.TransactionClient,
  ruleId: string
): Promise<void> {
  const affected = await tx.$executeRaw`
    UPDATE voucher_rules
    SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW()
    WHERE id = ${ruleId}
      AND "isActive" = true
      AND "validFrom" <= NOW()
      AND ("validUntil" IS NULL OR "validUntil" > NOW())
      AND ("quotaTotal" IS NULL OR "usedCount" < "quotaTotal")
  `;
  if (affected === 0) {
    throw new RedeemQuotaError("Kuota promo sudah habis");
  }
}

// Atomic per-customer seq claim as a SINGLE INSERT … SELECT: picks the first
// free seq in 1..maxSeq. This shape is required because Postgres aborts the
// whole transaction on a failed statement (25P02) — a "try seq 1, catch the
// unique violation, retry seq 2" loop cannot work inside $transaction.
// A genuine concurrent race for the same seq still ends in P2002 for the
// loser (mapped to RedeemQuotaError); the winner's unique constraint makes
// over-redemption impossible, unlike a racy COUNT().
const REFERRAL_QUOTA_MESSAGE =
  "Kode referral ini sudah mencapai batas pemakaian untuk nomor Anda";
const VOUCHER_QUOTA_MESSAGE = "Anda sudah mencapai batas pemakaian kode ini";

async function claimReferralSeq(
  tx: Prisma.TransactionClient,
  referralCodeId: string,
  refereeCustomerId: string,
  transactionId: string
): Promise<void> {
  try {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO referral_redemptions
        (id, "referralCodeId", "refereeCustomerId", "transactionId", seq, "redeemedAt")
      SELECT gen_random_uuid()::text, ${referralCodeId}, ${refereeCustomerId},
             ${transactionId}, s.seq, NOW()
      FROM generate_series(1, ${REFERRAL_MAX_REDEMPTIONS_PER_REFEREE}) AS s(seq)
      WHERE NOT EXISTS (
        SELECT 1 FROM referral_redemptions r
        WHERE r."referralCodeId" = ${referralCodeId}
          AND r."refereeCustomerId" = ${refereeCustomerId}
          AND r.seq = s.seq
      )
      ORDER BY s.seq
      LIMIT 1
      RETURNING id
    `;
    if (rows.length === 0) throw new RedeemQuotaError(REFERRAL_QUOTA_MESSAGE);
  } catch (error) {
    if (isUniqueViolation(error)) throw new RedeemQuotaError(REFERRAL_QUOTA_MESSAGE);
    throw error;
  }
}

async function claimVoucherSeq(
  tx: Prisma.TransactionClient,
  ruleId: string,
  customerId: string,
  transactionId: string,
  quotaPerCustomer: number
): Promise<void> {
  try {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO voucher_redemptions
        (id, "ruleId", "customerId", "transactionId", seq, "redeemedAt")
      SELECT gen_random_uuid()::text, ${ruleId}, ${customerId},
             ${transactionId}, s.seq, NOW()
      FROM generate_series(1, ${quotaPerCustomer}) AS s(seq)
      WHERE NOT EXISTS (
        SELECT 1 FROM voucher_redemptions v
        WHERE v."ruleId" = ${ruleId} AND v."customerId" = ${customerId}
          AND v.seq = s.seq
      )
      ORDER BY s.seq
      LIMIT 1
      RETURNING id
    `;
    if (rows.length === 0) throw new RedeemQuotaError(VOUCHER_QUOTA_MESSAGE);
  } catch (error) {
    if (isUniqueViolation(error)) throw new RedeemQuotaError(VOUCHER_QUOTA_MESSAGE);
    throw error;
  }
}

/**
 * Record a resolved redemption inside the order-creation transaction.
 *
 * Per-customer quotas are enforced by atomically claiming the next seq value
 * (see claimReferralSeq/claimVoucherSeq); quotaTotal by the guarded
 * usedCount increment. Throws RedeemQuotaError when any quota guard fails —
 * the caller should let the surrounding $transaction roll back and 400.
 */
export async function recordRedemption(
  tx: Prisma.TransactionClient,
  resolution: Extract<RedeemResolution, { ok: true }>,
  transactionId: string,
  customerId: string
): Promise<void> {
  if (resolution.kind === "REFERRAL") {
    await claimReferralSeq(
      tx,
      resolution.referralCodeId,
      customerId,
      transactionId
    );
    if (resolution.ruleId) {
      await incrementRuleUsage(tx, resolution.ruleId);
    }
    return;
  }

  // VOUCHER_RULE
  await claimVoucherSeq(
    tx,
    resolution.ruleId,
    customerId,
    transactionId,
    resolution.quotaPerCustomer
  );
  await incrementRuleUsage(tx, resolution.ruleId);
}

