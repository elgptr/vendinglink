-- Capture the rule used at reservation time so an expired PENDING referral
-- can release its total quota without guessing which rule is active later.
ALTER TABLE "referral_redemptions" ADD COLUMN "ruleId" TEXT;
CREATE INDEX "referral_redemptions_ruleId_idx" ON "referral_redemptions"("ruleId");
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "voucher_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;