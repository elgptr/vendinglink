-- AlterTable
ALTER TABLE "customer_product_requests" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isInvalidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentInvoiceUrl" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'PAY_ON_CONFIRM',
ADD COLUMN     "trackingToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customer_product_requests_trackingToken_key" ON "customer_product_requests"("trackingToken");

-- CreateIndex
CREATE INDEX "customer_product_requests_trackingToken_idx" ON "customer_product_requests"("trackingToken");
