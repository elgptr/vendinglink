-- ST-2a-2 Gelombang 2: backfill the new engine tables from the legacy tables.
-- Additive only — legacy tables/columns are dropped in Gelombang 3 (outside
-- this sprint). Safe to re-run: every statement is idempotent (ON CONFLICT /
-- guarded UPDATEs).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 2a. TD-8: split the overloaded Transaction.promoCodeId ──────────────────
-- Heuristic: a STOCKOUT_REFUND promo that is still UNUSED (usedAt IS NULL) and
-- is referenced by an OUT_OF_STOCK transaction is an ISSUED refund code → move
-- the reference to refundPromoCodeId. Codes with usedAt NOT NULL were APPLIED
-- at checkout → stay in promoCodeId.
-- Known ambiguity: a customer who applied a promo code AND hit a stockout
-- before settlement (code never marked used) is indistinguishable in legacy
-- data and will be classified as an issued refund. Accepted as best-effort.
UPDATE transactions t
SET "refundPromoCodeId" = t."promoCodeId",
    "promoCodeId" = NULL
FROM promo_codes p
WHERE t."promoCodeId" = p.id
  AND p.type = 'STOCKOUT_REFUND'
  AND p."usedAt" IS NULL
  AND t."stockStatus" = 'OUT_OF_STOCK';

-- ─── 2b. vouchers → voucher_rules ────────────────────────────────────────────
-- Legacy vouchers are flat-IDR, admin-managed → kind MANUAL / FIXED_IDR.
-- validFrom falls back to createdAt; expiresAt maps to validUntil.
INSERT INTO voucher_rules (
  id, code, name, kind, "discountType", value, "minSpend",
  "validFrom", "validUntil", "quotaTotal", "quotaPerCustomer",
  "isActive", "usedCount", "createdAt", "updatedAt"
)
SELECT v.id, v.code, v.code, 'MANUAL', 'FIXED_IDR', v."discountAmount", 0,
       v."createdAt", v."expiresAt", v.quota, 1,
       v."isActive", v."usedCount", v."createdAt", NOW()
FROM vouchers v
ON CONFLICT (code) DO NOTHING;

-- ─── 2c. promo_codes → customer_credits ──────────────────────────────────────
-- All legacy promo codes are STOCKOUT_REFUND. Status mapping:
--   usedAt NOT NULL            → REDEEMED
--   isActive = false           → VOID
--   expiresAt < now()          → EXPIRED
--   otherwise                  → ACCRUED
-- sourceTxnId  = transaction that ISSUED the code (post-2a refundPromoCodeId).
-- consumedTxnId = transaction that APPLIED the code (post-2a promoCodeId).
INSERT INTO customer_credits (
  id, "claimCode", kind, amount, status,
  "sourceTxnId", "consumedTxnId", "expiresAt", "createdAt", "updatedAt"
)
SELECT p.id, p.code, 'STOCKOUT_REFUND', p.discount,
       CASE
         WHEN p."usedAt" IS NOT NULL THEN 'REDEEMED'
         WHEN NOT p."isActive" THEN 'VOID'
         WHEN p."expiresAt" IS NOT NULL AND p."expiresAt" < NOW() THEN 'EXPIRED'
         ELSE 'ACCRUED'
       END,
       (SELECT t.id FROM transactions t WHERE t."refundPromoCodeId" = p.id LIMIT 1),
       (SELECT t.id FROM transactions t WHERE t."promoCodeId" = p.id LIMIT 1),
       p."expiresAt", p."createdAt", NOW()
FROM promo_codes p
ON CONFLICT ("claimCode") DO NOTHING;

-- ─── 2d. Customer backfill from historical transactions.customerPhone ────────
-- Normalization mirrors lib/phone.ts normalizePhone(): strip non-digits,
-- 08xx → 628xx, final check ^62\d{9,12}$. consentPromoAt stays NULL (B3: no
-- historical consent → never enters broadcast lists). ReferralCode is created
-- lazily by upsertCustomer() on the customer's next checkout.
INSERT INTO customers (id, phone, name, "consentPromoAt", "createdAt", "updatedAt")
SELECT 'cbk_' || REPLACE(gen_random_uuid()::text, '-', ''),
       normalized.phone, normalized.name, NULL, NOW(), NOW()
FROM (
  SELECT DISTINCT ON (phone)
    CASE
      WHEN REGEXP_REPLACE("customerPhone", '\D', '', 'g') LIKE '08%'
        THEN '62' || SUBSTRING(REGEXP_REPLACE("customerPhone", '\D', '', 'g') FROM 2)
      ELSE REGEXP_REPLACE("customerPhone", '\D', '', 'g')
    END AS phone,
    "customerName" AS name,
    "createdAt"
  FROM transactions
  WHERE "customerPhone" IS NOT NULL
  ORDER BY phone, "createdAt" DESC
) normalized
WHERE normalized.phone ~ '^62\d{9,12}$'
ON CONFLICT (phone) DO NOTHING;
