-- CreateEnum
CREATE TYPE "StoreWaitRequestType" AS ENUM ('ADD_TO_CART', 'CHECKOUT');

-- CreateEnum
CREATE TYPE "StoreWaitRequestStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "StoreWaitRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StoreWaitRequestType" NOT NULL,
    "status" "StoreWaitRequestStatus" NOT NULL DEFAULT 'WAITING',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreWaitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreWaitRequest_userId_status_idx" ON "StoreWaitRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "StoreWaitRequest_status_idx" ON "StoreWaitRequest"("status");

-- AddForeignKey
ALTER TABLE "StoreWaitRequest" ADD CONSTRAINT "StoreWaitRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
