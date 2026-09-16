export type ProductAvailability = 'LIMITED' | 'UNLIMITED' | 'UNAVAILABLE';

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface User {
  id: string;
  phoneNumber: string;
  name?: string | null;
  email?: string | null;
  role: string;
  isPhoneVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  children?: Category[];
  products?: Product[];
  _count?: { products: number };
}

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  type: string;
  priceAdjustment: string | number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string | number;
  freeDeliveryValue: string | number;
  freeDeliveryValueSubNear?: string | number;
  freeDeliveryValueSubFar?: string | number;
  availability: ProductAvailability;
  stock: number;
  isAvailable: boolean;
  isActive: boolean;
  isRecommended: boolean;
  images: string[];
  tags?: string[];
  category?: Category;
  categoryId?: string;
  variants?: ProductVariant[];
  condition?: 'NEW' | 'USED';
  hasOffer?: boolean;
  offerType?: string | null;
  offerValue?: string | number | null;
  offerStartDate?: string | null;
  offerEndDate?: string | null;
  /** Deterministic discovery reason from /products/discovery */
  recommendationReason?: string;
}

export interface SearchSuggestion {
  type: 'product' | 'category' | 'tag';
  label: string;
  value: string;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  suggestions: SearchSuggestion[];
  meta: {
    intent: string;
    normalizedQuery: string;
    fallbackUsed: boolean;
    hasPersonalization: boolean;
    totalBeforePagination: number;
  };
}

export interface PublicSettings {
  storeName?: string;
  storePhone?: string | null;
  freeDeliveryTarget?: string | number;
  partialFreeDeliveryEnabled?: boolean;
  partialFreeDeliveryThreshold?: string | number;
  partialFreeDeliveryDiscount?: number;
}

export interface CartItem {
  id: string;
  quantity: number;
  productId: string;
  variantId?: string | null;
  product: Product;
  variant?: ProductVariant | null;
}

export interface FreeDeliverySummary {
  actualScore: number;
  displayedScore: number;
  target: number;
  progressPercentage: number;
  partialEnabled: boolean;
  partialThreshold: number;
  partialDiscount: number;
  originalDeliveryFee: number;
  deliveryFee: number;
  deliveryDiscount: number;
  isFreeDelivery: boolean;
  isPartialFreeDelivery: boolean;
  areaEligibility: boolean | null;
  remainingScore: number;
  subtotal: number;
  totalItems: number;
  itemCount: number;
}

export interface CartResponse {
  items: CartItem[];
  summary: FreeDeliverySummary;
}

export type DeliveryRegion = 'NORTH' | 'GAZA' | 'MIDDLE' | 'SOUTH';

export interface DeliveryArea {
  id: string;
  name: string;
  deliveryFee: string | number;
  eligibleForFreeDelivery: boolean;
  isActive: boolean;
  areaType?: 'MAIN' | 'SUB_NEAR' | 'SUB_FAR';
  region?: DeliveryRegion | null;
  parentId?: string | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: string | number;
  freeDeliveryValue: string | number;
  freeDeliveryValueSubNear?: string | number;
  freeDeliveryValueSubFar?: string | number;
  variantInfo?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: string | number;
  deliveryFee: string | number;
  total: string | number;
  cartScore: string | number;
  deliveryAreaId: string;
  deliveryAddress: string;
  paymentReference?: string | null;
  paymentProof?: string | null;
  paymentNotes?: string | null;
  adminPaymentNotes?: string | null;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
  deliveryArea?: DeliveryArea;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  image?: string | null;
  priority: number;
  startDate: string;
  endDate?: string | null;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: { id: string; name?: string | null; phoneNumber?: string };
}

export interface ReviewSummary {
  averageRating: number;
  reviewCount: number;
}

export interface Favorite {
  id: string;
  productId: string;
  product: Product;
}

export interface SupportMessage {
  id: string;
  subject: string;
  message: string;
  isAdmin: boolean;
  isRead: boolean;
  orderId?: string | null;
  createdAt: string;
}

export interface PaymentAccountPublic {
  accountName: string;
  accountNumber: string;
  qrImageUrl?: string | null;
}

export type ElectronicPaymentMethodKey = 'bankOfPalestine' | 'palPay' | 'jawwalPay';

export interface PublicPaymentConfig {
  cod: {
    enabled: boolean;
    note?: string | null;
  };
  methods: {
    bankOfPalestine: PaymentAccountPublic | null;
    palPay: PaymentAccountPublic | null;
    jawwalPay: PaymentAccountPublic | null;
  };
  paymentInstructions?: string | null;
  paymentAccountDetails?: string | null;
  paymentQrImage?: string | null;
}

/** @deprecated Use PublicPaymentConfig */
export interface PaymentSettings {
  paymentInstructions?: string | null;
  paymentAccountDetails?: string | null;
  paymentQrImage?: string | null;
}

export interface StoreStatus {
  isOpen: boolean;
  message?: string | null;
}

export type StoreWaitRequestType = 'ADD_TO_CART' | 'CHECKOUT';
export type StoreWaitRequestStatus = 'WAITING' | 'NOTIFIED' | 'CANCELLED' | 'COMPLETED';

export interface StoreWaitRequest {
  id: string;
  userId: string;
  type: StoreWaitRequestType;
  status: StoreWaitRequestStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type RegisterStoreWaitPayload =
  | {
      type: 'ADD_TO_CART';
      productId: string;
      variantId?: string;
      quantity?: number;
    }
  | {
      type: 'CHECKOUT';
      deliveryAreaId: string;
      deliveryAddress: string;
      notes?: string;
    };

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type DiscoverySectionType =
  | 'personalized'
  | 'free_delivery_boost'
  | 'most_ordered'
  | 'most_favorited';

export interface DiscoverySection {
  sectionType: DiscoverySectionType;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  products: Product[];
}

export interface DiscoveryFeed {
  sections: DiscoverySection[];
  meta: {
    hasPersonalData: boolean;
    hasCartContext: boolean;
  };
}

/** Expected customer notification shape — align with backend when implemented. */
export type CustomerNotificationType =
  | 'order'
  | 'delivery'
  | 'free_delivery'
  | 'favorite'
  | 'offer'
  | 'system';

export type CustomerNotificationTargetType =
  | 'order'
  | 'product'
  | 'offer'
  | 'cart'
  | 'none';

export interface CustomerNotification {
  id: string;
  type: CustomerNotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  targetType: CustomerNotificationTargetType;
  targetId?: string | null;
  image?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationUnreadCount {
  count: number;
}

export interface CustomerNotificationPreferences {
  orderUpdates: boolean;
  freeDelivery: boolean;
  favorites: boolean;
  offers: boolean;
  personalRecommendations: boolean;
  newProducts: boolean;
  abuAlaaNews: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  doNotDisturbEnabled: boolean;
  doNotDisturbFrom: string | null;
  doNotDisturbUntil: string | null;
  updatedAt: string;
  channels: {
    pushSupported: boolean;
    emailSupported: boolean;
    deliverySchedulingSupported: boolean;
  };
}

export type NotificationPreferencePatch = Partial<
  Pick<
    CustomerNotificationPreferences,
    | 'orderUpdates'
    | 'freeDelivery'
    | 'favorites'
    | 'offers'
    | 'personalRecommendations'
    | 'newProducts'
    | 'abuAlaaNews'
    | 'pushEnabled'
    | 'emailEnabled'
    | 'doNotDisturbEnabled'
    | 'doNotDisturbFrom'
    | 'doNotDisturbUntil'
  >
>;
