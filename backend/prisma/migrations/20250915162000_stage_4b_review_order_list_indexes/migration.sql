-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Review_productId_createdAt_idx" ON "Review"("productId", "createdAt" DESC);
