-- Structured customer behavioral signals for the store assistant (no chat transcripts).
CREATE TYPE "CustomerInteractionType" AS ENUM (
  'CHAT_SEARCH',
  'CHAT_PRODUCT_CLICK',
  'CHAT_INTENT',
  'CHAT_CATEGORY_CLICK'
);

CREATE TABLE "CustomerInteraction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "CustomerInteractionType" NOT NULL,
  "searchTerm" TEXT,
  "productId" TEXT,
  "categoryId" TEXT,
  "intent" TEXT,
  "context" TEXT,
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'chatbot',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerInteraction_userId_createdAt_idx" ON "CustomerInteraction"("userId", "createdAt");
CREATE INDEX "CustomerInteraction_userId_type_idx" ON "CustomerInteraction"("userId", "type");
CREATE INDEX "CustomerInteraction_productId_idx" ON "CustomerInteraction"("productId");

ALTER TABLE "CustomerInteraction"
  ADD CONSTRAINT "CustomerInteraction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
