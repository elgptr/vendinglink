-- CreateTable
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

-- CreateTable
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
    "supplierMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "supplierProductId" TEXT,
    "supplierStock" INTEGER NOT NULL DEFAULT 0,
    "isSupplierAvailable" BOOLEAN NOT NULL DEFAULT true,
    "supplierLastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_product_mappings" (
    "supplierCode" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_product_mappings_pkey" PRIMARY KEY ("supplierCode","supplierProductId")
);

-- CreateTable
CREATE TABLE "redeem_stocks" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "redeemUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "bridgeTxId" TEXT,
    "claimedByAgentId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redeem_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "ai_configurations" (
    "id" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKey" TEXT,
    "chatModel" TEXT,
    "descriptionModel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "supplier_configs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastBalance" DOUBLE PRECISION,
    "lastCheckedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_drive_configs" (
    "id" TEXT NOT NULL,
    "clientEmail" TEXT,
    "privateKey" TEXT,
    "folderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_drive_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bridge_inbound_events" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "productId" TEXT,
    "addedQty" INTEGER NOT NULL,
    "insertedQty" INTEGER NOT NULL DEFAULT 0,
    "skippedQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bridge_inbound_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VoucherProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "supplier_product_mappings_productId_idx" ON "supplier_product_mappings"("productId");

-- CreateIndex
CREATE INDEX "redeem_stocks_productId_status_idx" ON "redeem_stocks"("productId", "status");

-- CreateIndex
CREATE INDEX "redeem_stocks_claimedByAgentId_status_idx" ON "redeem_stocks"("claimedByAgentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_orderId_key" ON "transactions"("orderId");

-- CreateIndex
CREATE INDEX "transactions_status_paidAt_idx" ON "transactions"("status", "paidAt");

-- CreateIndex
CREATE INDEX "transactions_agentId_paymentType_isSettled_idx" ON "transactions"("agentId", "paymentType", "isSettled");

-- CreateIndex
CREATE INDEX "transactions_customerPhone_status_idx" ON "transactions"("customerPhone", "status");

-- CreateIndex
CREATE INDEX "transactions_productId_status_idx" ON "transactions"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_configs_provider_key" ON "supplier_configs"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "bridge_inbound_events_transactionId_key" ON "bridge_inbound_events"("transactionId");

-- CreateIndex
CREATE INDEX "bridge_inbound_events_status_createdAt_idx" ON "bridge_inbound_events"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_VoucherProducts_AB_unique" ON "_VoucherProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_VoucherProducts_B_index" ON "_VoucherProducts"("B");

-- AddForeignKey
ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_stocks" ADD CONSTRAINT "redeem_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_stocks" ADD CONSTRAINT "redeem_stocks_claimedByAgentId_fkey" FOREIGN KEY ("claimedByAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VoucherProducts" ADD CONSTRAINT "_VoucherProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VoucherProducts" ADD CONSTRAINT "_VoucherProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

