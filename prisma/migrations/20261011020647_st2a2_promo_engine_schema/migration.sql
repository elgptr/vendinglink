-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "refundPromoCodeId" TEXT;

-- CreateTable
CREATE TABLE "program_configs" (
    "id" TEXT NOT NULL,
    "referralCommissionPct" INTEGER NOT NULL DEFAULT 5,
    "referralCommissionCap" INTEGER,
    "refereeDiscountValue" INTEGER NOT NULL DEFAULT 0,
    "accrualWindowDays" INTEGER NOT NULL DEFAULT 15,
    "minPayoutAmount" INTEGER NOT NULL DEFAULT 20000,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_credits" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "claimCode" TEXT,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "appliedRatePct" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACCRUED',
    "sourceTxnId" TEXT,
    "consumedTxnId" TEXT,
    "referralCodeId" TEXT,
    "payoutBatchId" TEXT,
    "payableAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'MANUAL',
    "discountType" TEXT NOT NULL DEFAULT 'FIXED_IDR',
    "value" INTEGER NOT NULL,
    "maxDiscount" INTEGER,
    "minSpend" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "quotaTotal" INTEGER,
    "quotaPerCustomer" INTEGER NOT NULL DEFAULT 1,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_redemptions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 1,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_redemptions" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "refereeCustomerId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 1,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_batches" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'GOPAY',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_credits_claimCode_key" ON "customer_credits"("claimCode");

-- CreateIndex
CREATE INDEX "customer_credits_customerId_status_idx" ON "customer_credits"("customerId", "status");

-- CreateIndex
CREATE INDEX "customer_credits_status_payableAt_idx" ON "customer_credits"("status", "payableAt");

-- CreateIndex
CREATE INDEX "customer_credits_payoutBatchId_idx" ON "customer_credits"("payoutBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_credits_kind_sourceTxnId_key" ON "customer_credits"("kind", "sourceTxnId");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_rules_code_key" ON "voucher_rules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_redemptions_ruleId_customerId_seq_key" ON "voucher_redemptions"("ruleId", "customerId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_redemptions_ruleId_transactionId_key" ON "voucher_redemptions"("ruleId", "transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_redemptions_referralCodeId_refereeCustomerId_seq_key" ON "referral_redemptions"("referralCodeId", "refereeCustomerId", "seq");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_refundPromoCodeId_fkey" FOREIGN KEY ("refundPromoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credits" ADD CONSTRAINT "customer_credits_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credits" ADD CONSTRAINT "customer_credits_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credits" ADD CONSTRAINT "customer_credits_payoutBatchId_fkey" FOREIGN KEY ("payoutBatchId") REFERENCES "payout_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_rules" ADD CONSTRAINT "voucher_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "voucher_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_refereeCustomerId_fkey" FOREIGN KEY ("refereeCustomerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
