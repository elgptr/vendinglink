-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "outstandingDebt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable products
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "showOriginalPrice" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL DEFAULT 'LINK',
    "description" TEXT,
    "guideImageUrl" TEXT,
    "guideText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable redeem_stocks
CREATE TABLE "redeem_stocks" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "redeemUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "claimedByAgentId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redeem_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable vouchers
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "quota" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable transactions
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "agentId" TEXT,
    "voucherId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "paymentType" TEXT NOT NULL DEFAULT 'MIDTRANS',
    "originalPrice" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "finalAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stockStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "redeemUrl" TEXT,
    "promoCodeId" TEXT,
    "qrString" TEXT,
    "qrCodeUrl" TEXT,
    "snapToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable ai_configurations
CREATE TABLE "ai_configurations" (
    "id" TEXT NOT NULL,
    "geminiApiKey" TEXT,
    "anthropicApiKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable promo_codes
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STOCKOUT_REFUND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex redeem_stocks_productId_status_idx
CREATE INDEX "redeem_stocks_productId_status_idx" ON "redeem_stocks"("productId", "status");

-- CreateIndex redeem_stocks_claimedByAgentId_status_idx
CREATE INDEX "redeem_stocks_claimedByAgentId_status_idx" ON "redeem_stocks"("claimedByAgentId", "status");

-- CreateIndex transactions_status_paidAt_idx
CREATE INDEX "transactions_status_paidAt_idx" ON "transactions"("status", "paidAt");

-- CreateIndex transactions_agentId_paymentType_isSettled_idx
CREATE INDEX "transactions_agentId_paymentType_isSettled_idx" ON "transactions"("agentId", "paymentType", "isSettled");

-- CreateIndex transactions_customerPhone_status_idx
CREATE INDEX "transactions_customerPhone_status_idx" ON "transactions"("customerPhone", "status");

-- CreateIndex transactions_productId_status_idx
CREATE INDEX "transactions_productId_status_idx" ON "transactions"("productId", "status");

-- CreateUnique users_username_key
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateUnique vouchers_code_key
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateUnique transactions_orderId_key
CREATE UNIQUE INDEX "transactions_orderId_key" ON "transactions"("orderId");

-- CreateUnique promo_codes_code_key
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- AddForeignKey redeem_stocks -> products
ALTER TABLE "redeem_stocks" ADD CONSTRAINT "redeem_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey redeem_stocks -> users
ALTER TABLE "redeem_stocks" ADD CONSTRAINT "redeem_stocks_claimedByAgentId_fkey" FOREIGN KEY ("claimedByAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey transactions -> products
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey transactions -> users
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey transactions -> vouchers
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey transactions -> promo_codes
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
