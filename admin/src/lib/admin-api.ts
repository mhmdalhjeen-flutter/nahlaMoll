import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from './api';
import type {
  AnalyticsOverview,
  Announcement,
  Category,
  DeliveryArea,
  Order,
  PaginatedList,
  PaginatedProducts,
  PaymentAccount,
  PaymentAdminConfig,
  Product,
  Review,
  Settings,
  SupportMessage,
} from './types';

export const adminApi = {
  login: (email: string, password: string) =>
    apiPost<{ user: unknown; accessToken: string; refreshToken: string }>('/auth/admin/login', { email, password }),

  getAnalytics: () => apiGet<AnalyticsOverview>('/admin/analytics/overview'),

  getProducts: (params?: {
    page?: number;
    limit?: number;
    includeInactive?: boolean;
    categoryId?: string;
  }) => apiGet<PaginatedProducts>('/admin/products', params),
  getProduct: (id: string) => apiGet<Product>(`/admin/products/${id}`),
  createProduct: (data: Record<string, unknown>) => apiPost<Product>('/admin/products', data),
  updateProduct: (id: string, data: Record<string, unknown>) => apiPatch<Product>(`/admin/products/${id}`, data),
  deactivateProduct: (id: string) => apiPatch(`/admin/products/${id}/deactivate`),
  deleteProduct: (id: string) => apiDelete(`/admin/products/${id}`),
  uploadProductImage: (file: File) => apiUpload<{ url: string; key: string }>('/admin/upload/product-image', file),
  uploadCategoryImage: (file: File) => apiUpload<{ url: string; key: string }>('/admin/upload/category-image', file),

  getCategories: () => apiGet<Category[]>('/admin/categories'),
  createCategory: (data: Record<string, unknown>) => apiPost<Category>('/admin/categories', data),
  updateCategory: (id: string, data: Record<string, unknown>) => apiPatch<Category>(`/admin/categories/${id}`, data),
  activateCategory: (id: string) => apiPatch(`/admin/categories/${id}/activate`),
  deactivateCategory: (id: string) => apiPatch(`/admin/categories/${id}/deactivate`),
  deleteCategory: (id: string) => apiDelete(`/admin/categories/${id}`),

  getDeliveryAreas: () => apiGet<DeliveryArea[]>('/admin/delivery/areas'),
  createDeliveryArea: (data: Record<string, unknown>) => apiPost<DeliveryArea>('/admin/delivery/areas', data),
  updateDeliveryArea: (id: string, data: Record<string, unknown>) => apiPut<DeliveryArea>(`/admin/delivery/areas/${id}`, data),
  activateDeliveryArea: (id: string) => apiPatch(`/admin/delivery/areas/${id}/activate`),
  deactivateDeliveryArea: (id: string) => apiPatch(`/admin/delivery/areas/${id}/deactivate`),
  deleteDeliveryArea: (id: string) => apiDelete(`/admin/delivery/areas/${id}`),

  getSettings: () => apiGet<Settings>('/admin/settings'),
  updateSettings: (data: Record<string, unknown>) => apiPut<Settings>('/admin/settings', data),
  uploadPaymentQr: (file: File) => apiUpload<{ url: string }>('/admin/upload/payment-qr', file),

  getPaymentConfig: () => apiGet<PaymentAdminConfig>('/admin/payment/config'),
  updateCodSettings: (data: { codEnabled?: boolean; codNote?: string }) =>
    apiPatch('/admin/payment/cod', data),
  setPaymentMethodEnabled: (method: string, enabled: boolean) =>
    apiPatch(`/admin/payment/methods/${method}/enabled`, { enabled }),
  createPaymentAccount: (data: Record<string, unknown>) =>
    apiPost<PaymentAccount>('/admin/payment/accounts', data),
  updatePaymentAccount: (id: string, data: Record<string, unknown>) =>
    apiPatch<PaymentAccount>(`/admin/payment/accounts/${id}`, data),
  activatePaymentAccount: (id: string) =>
    apiPatch<PaymentAccount>(`/admin/payment/accounts/${id}/activate`),
  deletePaymentAccount: (id: string) => apiDelete(`/admin/payment/accounts/${id}`),

  getOrders: (params?: { page?: number; limit?: number }) =>
    apiGet<PaginatedList<Order>>('/admin/orders', params),
  getOrder: (id: string) => apiGet<Order>(`/admin/orders/${id}`),
  updateOrderStatus: (id: string, status: string, adminNotes?: string) =>
    apiPatch<Order>(`/admin/orders/${id}/status`, { status, adminNotes }),
  verifyPayment: (id: string, adminPaymentNotes?: string) =>
    apiPost<Order>(`/admin/orders/${id}/payment/verify`, { adminPaymentNotes }),
  rejectPayment: (id: string, adminPaymentNotes?: string) =>
    apiPost<Order>(`/admin/orders/${id}/payment/reject`, { adminPaymentNotes }),
  deleteOrder: (id: string) => apiDelete<{ deleted: boolean }>(`/admin/orders/${id}`),

  getAnnouncements: () => apiGet<Announcement[]>('/admin/announcements'),
  createAnnouncement: (data: Record<string, unknown>) => apiPost<Announcement>('/admin/announcements', data),
  updateAnnouncement: (id: string, data: Record<string, unknown>) => apiPatch<Announcement>(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => apiDelete(`/admin/announcements/${id}`),
  uploadAnnouncementImage: (file: File) => apiUpload<{ url: string }>('/admin/upload/announcement-image', file),

  getSupportMessages: (unreadOnly?: boolean) =>
    apiGet<SupportMessage[]>('/admin/support/messages', unreadOnly ? { unreadOnly: 'true' } : undefined),
  getSupportThread: (userId: string) => apiGet<SupportMessage[]>(`/admin/support/threads/${userId}`),
  replySupport: (userId: string, message: string, subject?: string) =>
    apiPost(`/admin/support/threads/${userId}/reply`, { message, subject }),
  markSupportRead: (userId: string) => apiPatch(`/admin/support/threads/${userId}/read`),

  getReviews: () => apiGet<Review[]>('/admin/reviews'),
};
