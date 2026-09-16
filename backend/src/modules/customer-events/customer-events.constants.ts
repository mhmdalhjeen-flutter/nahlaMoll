/** Reject payloads that may contain credentials or payment details. */
export const CUSTOMER_EVENT_SENSITIVE_PATTERN =
  /(otp|password|token|payment.?proof|cvv|iban|محفظة|كلمة.?السر|رمز.?تحقق)/i;

/** Documented default retention window for future cleanup jobs (not enforced in Phase 0). */
export const CUSTOMER_EVENT_RETENTION_DAYS = 365;

export const CUSTOMER_EVENT_SOURCES = {
  STORE: "store",
  CHATBOT: "chatbot",
  SERVER: "server",
  DISCOVERY: "discovery",
  SEARCH: "search",
  CHECKOUT: "checkout",
  PRODUCT_DETAIL: "product_detail",
  CATEGORY: "category",
} as const;

export type CustomerEventSource =
  (typeof CUSTOMER_EVENT_SOURCES)[keyof typeof CUSTOMER_EVENT_SOURCES];
