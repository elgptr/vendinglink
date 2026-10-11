-- Ensure concurrent requests cannot create duplicate period/channel batches.
CREATE UNIQUE INDEX "payout_batches_period_channel_key" ON "payout_batches"("period", "channel");