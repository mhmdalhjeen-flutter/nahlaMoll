-- Extend assistant behavioral event types for basket and category flows
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CHAT_CATEGORY_INTERACTION';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CHAT_BASKET_REQUEST';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CHAT_BASKET_ACCEPTED';
ALTER TYPE "CustomerInteractionType" ADD VALUE 'CHAT_BASKET_PRODUCT_SELECTION';
