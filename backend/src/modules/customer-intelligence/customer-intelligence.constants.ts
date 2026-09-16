import { CustomerInteractionType } from "@prisma/client";

/** Events older than this are excluded from profile computation. */
export const INTELLIGENCE_LOOKBACK_DAYS = 365;

/** Signals within this window count as "recent" in the profile output. */
export const INTELLIGENCE_RECENT_DAYS = 7;

/** Half-life for exponential recency decay (days). */
export const INTELLIGENCE_HALF_LIFE_DAYS = 14;

/** Dedupe window — chatbot + store variants of the same action collapse to one signal. */
export const INTELLIGENCE_DEDUPE_WINDOW_MS = 4 * 60 * 60 * 1000;

/** Minimum deduped signal count to treat a customer as having behavioral data. */
export const INTELLIGENCE_MIN_SIGNAL_COUNT = 2;

/** Max events loaded per profile build (newest first). */
export const INTELLIGENCE_MAX_EVENTS = 500;

/** Base weights before recency decay — higher = stronger interest. */
export const EVENT_BASE_WEIGHTS: Partial<
  Record<CustomerInteractionType, number>
> = {
  ORDER_COMPLETED: 6,
  ORDER_CREATED: 5,
  RECOMMENDATION_PURCHASED: 5,
  FAVORITE_ADDED: 4,
  CHAT_BASKET_ACCEPTED: 3.5,
  CART_ITEM_ADDED: 3,
  RECOMMENDATION_ADDED_TO_CART: 3,
  SEARCH_RESULT_CLICK: 2.5,
  PRODUCT_CLICKED: 2.5,
  RECOMMENDATION_CLICKED: 2.5,
  CHAT_PRODUCT_CLICK: 2.5,
  CHAT_BASKET_PRODUCT_SELECTION: 2.5,
  CHECKOUT_STARTED: 2,
  CATEGORY_CLICKED: 2,
  CHAT_CATEGORY_CLICK: 2,
  CHAT_CATEGORY_INTERACTION: 1.5,
  SEARCH_QUERY: 1,
  CHAT_SEARCH: 1,
  PRODUCT_VIEWED: 1,
  CATEGORY_VIEWED: 1,
  CART_QUANTITY_CHANGED: 1,
  RECOMMENDATION_SHOWN: 0.3,
  CHAT_INTENT: 0.5,
  CHAT_BASKET_REQUEST: 0.5,
  SEARCH_NO_RESULTS: 0.5,
  FAVORITE_REMOVED: -1.5,
  CART_ITEM_REMOVED: -1,
  ORDER_CANCELLED: -2,
  RECOMMENDATION_DISMISSED: -0.5,
};

/** Supplemental commerce-table weights (pre-Phase-0 history without events). */
export const SUPPLEMENTAL_WEIGHTS = {
  favorite: 4,
  cart: 3,
  order: 5,
} as const;
