import type { Order, Product } from '@/lib/types';
import type { BasketCriteria, BasketSuggestion } from './basket-builder';

export type AssistantSuggestionContext =
  | 'welcome'
  | 'products'
  | 'category'
  | 'product_detail'
  | 'basket'
  | 'recipe'
  | 'order'
  | 'free_delivery'
  | 'unknown';

export interface AssistantSuggestion {
  id: string;
  label: string;
}

export interface AssistantOrderPreview {
  orderId: string;
  orderNumber: string;
  statusLabel: string;
  helper: string;
}

export interface AssistantCompactItem {
  productId: string;
  label: string;
  emoji: string;
  mappedProductName?: string;
  unavailable?: boolean;
}

export interface AssistantTurn {
  reply: string;
  products?: Product[];
  focusProduct?: Product;
  similarSectionTitle?: string;
  compactItems?: AssistantCompactItem[];
  baskets?: BasketSuggestion[];
  basketCriteria?: BasketCriteria;
  categoryId?: string;
  categoryName?: string;
  order?: AssistantOrderPreview;
  suggestions: AssistantSuggestion[];
  showSupport?: boolean;
  supportLabel?: string;
  suggestionContext?: AssistantSuggestionContext;
  sessionPatch?: Partial<AssistantSessionState>;
}

export interface AssistantSessionState {
  lastSearchTerm?: string;
  lastCategoryId?: string;
  lastProductId?: string;
  lastIntent?: string;
  lastBasketCriteria?: BasketCriteria;
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: Product[];
  focusProduct?: Product;
  similarSectionTitle?: string;
  compactItems?: AssistantCompactItem[];
  baskets?: BasketSuggestion[];
  order?: AssistantOrderPreview;
  showSupport?: boolean;
  supportLabel?: string;
}

export type AssistantInteractionType =
  | 'CHAT_SEARCH'
  | 'CHAT_PRODUCT_CLICK'
  | 'CHAT_INTENT'
  | 'CHAT_CATEGORY_CLICK'
  | 'CHAT_CATEGORY_INTERACTION'
  | 'CHAT_BASKET_REQUEST'
  | 'CHAT_BASKET_ACCEPTED'
  | 'CHAT_BASKET_PRODUCT_SELECTION';

export interface AssistantInteractionPayload {
  type: AssistantInteractionType;
  searchTerm?: string;
  productId?: string;
  categoryId?: string;
  intent?: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

export type AssistantQuickActionId =
  | 'discover_products'
  | 'free_delivery'
  | 'my_orders'
  | 'popular'
  | 'gift';

export interface AssistantEngineContext {
  isAuthenticated: boolean;
  cartProductIds?: string;
  displayProgress?: number;
  remainingScore?: number;
  paymentConfigLoaded?: boolean;
}

export interface AssistantEngineDeps {
  searchProducts: (query: string) => Promise<Product[]>;
  getDiscoveryFeed: (params: {
    categoryId?: string;
    cartProductIds?: string;
    displayProgress?: number;
    remainingScore?: number;
    limit?: number;
  }) => Promise<{ sections: { sectionType: string; products: Product[] }[] }>;
  getOrders?: () => Promise<Order[]>;
  getCategories?: () => Promise<import('@/lib/types').Category[]>;
  getProducts?: (params: {
    page?: number;
    limit?: number;
    categoryId?: string;
  }) => Promise<import('@/lib/types').PaginatedProducts>;
  getProduct?: (id: string) => Promise<Product>;
  addToCart?: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => Promise<unknown>;
}
