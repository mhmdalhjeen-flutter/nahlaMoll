/** Unified behavioral event types (matches backend CustomerInteractionType). */
export type CustomerEventType =
  // Chatbot
  | 'CHAT_SEARCH'
  | 'CHAT_PRODUCT_CLICK'
  | 'CHAT_INTENT'
  | 'CHAT_CATEGORY_CLICK'
  | 'CHAT_CATEGORY_INTERACTION'
  | 'CHAT_BASKET_REQUEST'
  | 'CHAT_BASKET_ACCEPTED'
  | 'CHAT_BASKET_PRODUCT_SELECTION'
  // Store-wide
  | 'PRODUCT_VIEWED'
  | 'PRODUCT_CLICKED'
  | 'SEARCH_QUERY'
  | 'SEARCH_RESULT_CLICK'
  | 'SEARCH_NO_RESULTS'
  | 'CATEGORY_VIEWED'
  | 'CATEGORY_CLICKED'
  | 'CART_ITEM_ADDED'
  | 'CART_ITEM_REMOVED'
  | 'CART_QUANTITY_CHANGED'
  | 'FAVORITE_ADDED'
  | 'FAVORITE_REMOVED'
  | 'CHECKOUT_STARTED'
  | 'ORDER_CREATED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'RECOMMENDATION_SHOWN'
  | 'RECOMMENDATION_CLICKED'
  | 'RECOMMENDATION_ADDED_TO_CART'
  | 'RECOMMENDATION_PURCHASED'
  | 'RECOMMENDATION_DISMISSED';

export interface CustomerEventPayload {
  type: CustomerEventType;
  searchTerm?: string;
  productId?: string;
  categoryId?: string;
  intent?: string;
  context?: string;
  metadata?: Record<string, unknown>;
  source?: string;
}

export interface RecommendationTrackingContext {
  sectionType: string;
}
