-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('BANK_OF_PALESTINE', 'PALPAY', 'JAWWAL_PAY');

-- CreateTable
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "method" "PaymentMethodType" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "qrImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "codEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "codNote" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bankOfPalestineEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "palPayEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "jawwalPayEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "PaymentAccount_method_idx" ON "PaymentAccount"("method");
CREATE INDEX "PaymentAccount_method_isActive_idx" ON "PaymentAccount"("method", "isActive");
