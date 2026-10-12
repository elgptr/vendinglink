-- CreateTable
CREATE TABLE "customer_product_requests" (
    "id" TEXT NOT NULL,
    "bridgeRequestId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "customerRef" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "categorySlug" TEXT,
    "maxBudget" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'SEARCHING',
    "quotedPrice" DOUBLE PRECISION,
    "foundSupplierCode" TEXT,
    "foundProductId" TEXT,
    "rejectionReason" TEXT,
    "transactionId" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_product_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_product_requests_bridgeRequestId_key" ON "customer_product_requests"("bridgeRequestId");

-- CreateIndex
CREATE INDEX "customer_product_requests_status_createdAt_idx" ON "customer_product_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "customer_product_requests_customerPhone_idx" ON "customer_product_requests"("customerPhone");

-- CreateIndex
CREATE INDEX "customer_product_requests_customerRef_idx" ON "customer_product_requests"("customerRef");

-- AddForeignKey
ALTER TABLE "customer_product_requests" ADD CONSTRAINT "customer_product_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
