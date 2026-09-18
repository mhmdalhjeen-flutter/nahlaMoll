import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from './api';
import type {
  Announcement,
  AuthTokens,
  CartItem,
  CartResponse,
  Category,
  CustomerNotificationPreferences,
  DeliveryArea,
  DiscoveryFeed,
  Favorite,
  Order,
  CustomerNotification,
  NotificationPreferencePatch,
  NotificationUnreadCount,
  SearchResult,
  PaginatedProducts,
  PaginatedList,
  Product,
  Review,
  ReviewSummary,
  StoreStatus,
  StoreWaitRequest,
  RegisterStoreWaitPayload,
  SupportMessage,
  User,
  PublicSettings,
  PublicPaymentConfig,
} from './types';
import type { CustomerEventPayload } from './customer-events.types';

export const storeApi = {
  // Auth
  sendOtp: (phoneNumber: string) =>
    apiPost<{ message: string; devOtp?: string }>('/auth/send-otp', { phoneNumber }),
  verifyOtp: (phoneNumber: string, code: string) =>
    apiPost<{ user: User } & AuthTokens>('/auth/verify-otp', { phoneNumber, code }),

  // Store
  getStoreStatus: () => apiGet<StoreStatus>('/settings/store-status'),
  getPublicSettings: () => apiGet<PublicSettings>('/settings'),
  getPaymentSettings: () => apiGet<PublicPaymentConfig>('/settings/payment'),

  // Categories
  getCategories: () => apiGet<Category[]>('/categories'),
  getCategoryBySlug: (slug: string) => apiGet<Category>(`/categories/slug/${slug}`),

  // Products
  getProducts: (params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    condition?: 'NEW' | 'USED';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => apiGet<PaginatedProducts>('/products', params),
  getProduct: (id: string) => apiGet<Product>(`/products/${id}`),
  searchProducts: (q: string, params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    condition?: 'NEW' | 'USED';
    sortBy?: 'relevance' | 'price' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) => apiGet<SearchResult>('/products/search', { q, ...params }),
  getRecommended: () => apiGet<Product[]>('/products/recommended'),
  getOffers: () => apiGet<Product[]>('/products/offers'),
  getDiscoveryFeed: (params?: {
    categoryId?: string;
    cartProductIds?: string;
    displayProgress?: number;
    remainingScore?: number;
    limit?: number;
    sections?: string;
  }) => apiGet<DiscoveryFeed>('/products/discovery', params),
  getUsedProducts: (params?: { page?: number; limit?: number }) =>
    apiGet<PaginatedProducts>('/products', { ...params, condition: 'USED' }),

  // Cart
  getCart: (deliveryAreaId?: string) =>
    apiGet<CartResponse>('/cart', deliveryAreaId ? { deliveryAreaId } : undefined),
  addToCart: (productId: string, quantity: number, variantId?: string) =>
    apiPost<CartItem>('/cart/items', { productId, quantity, variantId }),
  updateCartItem: (id: string, quantity: number) =>
    apiPut(`/cart/items/${id}`, { quantity }),
  removeCartItem: (id: string) => apiDelete(`/cart/items/${id}`),
  clearCart: () => apiDelete('/cart'),

  // Delivery
  getDeliveryAreas: () => apiGet<DeliveryArea[]>('/delivery/areas'),

  // Orders
  createOrder: (data: { deliveryAreaId: string; deliveryAddress: string; notes?: string }) =>
    apiPost<Order>('/orders', data),
  getOrders: (params?: { page?: number; limit?: number }) =>
    apiGet<PaginatedList<Order>>('/orders', params),
  getOrder: (id: string) => apiGet<Order>(`/orders/${id}`),
  submitPayment: (
    orderId: string,
    data: { paymentReference: string; paymentNotes?: string; paymentProof?: string },
  ) => apiPost<Order>(`/orders/${orderId}/payment`, data),
  cancelOrder: (orderId: string) => apiPost<Order>(`/orders/${orderId}/cancel`),
  deleteOrder: (orderId: string) => apiDelete<{ deleted: boolean }>(`/orders/${orderId}`),

  // Store wait (closed store)
  getStoreWaitRequest: () => apiGet<StoreWaitRequest | null>('/store-wait/me'),
  registerStoreWait: (data: RegisterStoreWaitPayload) =>
    apiPost<StoreWaitRequest>('/store-wait', data),
  cancelStoreWaitRequest: () => apiDelete<{ cancelled: boolean }>('/store-wait/me'),
  completeStoreWaitRequest: () =>
    apiPost<{ completed: boolean }>('/store-wait/me/complete'),

  // Favorites
  getFavorites: (params?: { page?: number; limit?: number }) =>
    apiGet<PaginatedList<Favorite>>('/favorites', params),
  addFavorite: (productId: string) => apiPost(`/favorites/${productId}`),
  removeFavorite: (productId: string) => apiDelete(`/favorites/${productId}`),
  getFavoriteStatus: (productId: string) =>
    apiGet<{ isFavorite: boolean }>(`/favorites/${productId}/status`),

  // Reviews
  getProductReviews: (
    productId: string,
    params?: { page?: number; limit?: number },
  ) => apiGet<PaginatedList<Review>>(`/reviews/product/${productId}`, params),
  getReviewSummary: (productId: string) =>
    apiGet<ReviewSummary>(`/reviews/product/${productId}/summary`),
  createReview: (productId: string, data: { rating: number; comment?: string }) =>
    apiPost(`/reviews/product/${productId}`, data),
  deleteReview: (productId: string) => apiDelete(`/reviews/product/${productId}`),

  // Announcements
  getAnnouncements: () => apiGet<Announcement[]>('/announcements'),

  // Support
  getSupportMessages: () => apiGet<SupportMessage[]>('/support/messages'),
  sendSupportMessage: (data: { subject: string; message: string; orderId?: string }) =>
    apiPost<SupportMessage>('/support/messages', data),

  // Profile
  getProfile: () => apiGet<User>('/users/profile'),
  updateProfile: (data: { name?: string; email?: string }) =>
    apiPut<User>('/users/profile', data),

  // Notifications (requires backend — see NOTIFICATIONS_API_ENABLED)
  getNotifications: (params?: { page?: number; limit?: number }) =>
    apiGet<PaginatedList<CustomerNotification>>('/notifications', params),
  getNotificationUnreadCount: () => apiGet<NotificationUnreadCount>('/notifications/unread-count'),
  markNotificationRead: (id: string) => apiPost<CustomerNotification>(`/notifications/${id}/read`),
  markAllNotificationsRead: () => apiPost<{ updated: number }>('/notifications/read-all'),
  getNotificationPreferences: () =>
    apiGet<CustomerNotificationPreferences>('/notifications/preferences'),
  updateNotificationPreferences: (data: NotificationPreferencePatch) =>
    apiPatch<CustomerNotificationPreferences>('/notifications/preferences', data),

  // Unified behavioral events (guest + authenticated)
  recordCustomerEvent: (data: CustomerEventPayload & { sessionId?: string }) =>
    apiPost<{ id: string; createdAt: string }>('/events', data),

  mergeCustomerSession: (sessionId: string) =>
    apiPost<{ merged: number }>('/events/merge-session', { sessionId }),

  // Store assistant behavioral signals (authenticated — backward compatible)
  recordAssistantInteraction: (data: CustomerEventPayload) =>
    apiPost<{ id: string; createdAt: string }>('/assistant/interactions', data),

  // Upload
  uploadPaymentProof: (file: File) =>
    apiUpload<{ url: string; key: string }>('/upload/payment-proof', file),
};
