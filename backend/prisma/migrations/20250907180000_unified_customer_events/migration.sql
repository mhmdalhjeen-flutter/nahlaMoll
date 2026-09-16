-- Phase 0: unified behavioral event foundation (extends CustomerInteraction).
ALTER TABLE "CustomerInteraction" ADD COLUMN "sessionId" TEXT;

ALTER TABLE "CustomerInteraction" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "CustomerInteraction" ALTER COLUMN "source" SET DEFAULT 'store';

CREATE INDEX "CustomerInteraction_sessionId_createdAt_idx"
  ON "CustomerInteraction"("sessionId", "createdAt");

ALTER TYPE "CustomerInteractionType" ADD VALUE 'PRODUCT_VIEWED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'PRODUCT_CLICKED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'SEARCH_QUERY';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'SEARCH_RESULT_CLICK';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'SEARCH_NO_RESULTS';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CATEGORY_VIEWED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CATEGORY_CLICKED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CART_ITEM_ADDED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CART_ITEM_REMOVED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CART_QUANTITY_CHANGED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'FAVORITE_ADDED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'FAVORITE_REMOVED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CHECKOUT_STARTED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'ORDER_CREATED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'ORDER_COMPLETED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'ORDER_CANCELLED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'RECOMMENDATION_SHOWN';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'RECOMMENDATION_CLICKED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'RECOMMENDATION_ADDED_TO_CART';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'RECOMMENDATION_PURCHASED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'RECOMMENDATION_DISMISSED';
