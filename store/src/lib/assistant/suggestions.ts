import type { AssistantSuggestion, AssistantSuggestionContext } from './types';

export const WELCOME_SUGGESTIONS: AssistantSuggestion[] = [
  { id: 'discover_products', label: '🛒 ساعدني أختار منتجات' },
  { id: 'free_delivery', label: '🚚 كيف أوصل للتوصيل المجاني؟' },
  { id: 'my_orders', label: '📦 وين طلبي؟' },
  { id: 'popular', label: '🔥 شو أكثر المنتجات طلبًا؟' },
  { id: 'gift', label: '🎁 بدي أشتري هدية' },
];

export const PRODUCT_SUGGESTIONS: AssistantSuggestion[] = [
  { id: 'cheaper_options', label: '🔎 خيارات أرخص' },
  { id: 'top_rated', label: '⭐ الأعلى تقييمًا' },
  { id: 'free_delivery_boost', label: '🚚 منتجات تساعدني أكمل التوصيل المجاني' },
  { id: 'more_options', label: '🔄 خيارات ثانية' },
];

export const CATEGORY_SUGGESTIONS: AssistantSuggestion[] = [
  { id: 'browse_fruits', label: '🍅 شوف الفواكه' },
  { id: 'recipe_ingredients', label: '🍲 مكونات طبخة' },
  { id: 'build_basket', label: '🛒 كوّنلي سلة' },
];

export const BASKET_SUGGESTIONS: AssistantSuggestion[] = [
  { id: 'basket_more_variety', label: '🍎 أكثر تنوع' },
  { id: 'basket_cheaper', label: '💰 أوفر' },
  { id: 'basket_free_delivery', label: '🚚 ساعدني أكمل التوصيل' },
  { id: 'more_options', label: '🔄 خيارات ثانية' },
];

export const PRODUCT_DETAIL_SUGGESTIONS: AssistantSuggestion[] = [
  { id: 'similar_products', label: '🔎 منتجات مشابهة' },
  { id: 'cheaper_options', label: '💰 خيارات أرخص' },
  { id: 'build_basket', label: '🛒 كوّنلي سلة' },
];

export const ORDER_SUGGESTIONS: AssistantSuggestion[] = [
  { id: 'order_details', label: '📦 تفاصيل الطلب' },
  { id: 'track_order', label: '🚚 متابعة الطلب' },
  { id: 'order_problem', label: '❓ عندي مشكلة بالطلب' },
];

export function getSuggestionsForContext(context: AssistantSuggestionContext): AssistantSuggestion[] {
  switch (context) {
    case 'products':
      return PRODUCT_SUGGESTIONS;
    case 'category':
      return CATEGORY_SUGGESTIONS;
    case 'product_detail':
      return PRODUCT_DETAIL_SUGGESTIONS;
    case 'basket':
      return BASKET_SUGGESTIONS;
    case 'recipe':
      return CATEGORY_SUGGESTIONS;
    case 'order':
      return ORDER_SUGGESTIONS;
    case 'free_delivery':
      return [
        { id: 'free_delivery_boost', label: '🚚 منتجات تساعدني أكمل التوصيل المجاني' },
        { id: 'discover_products', label: '🛒 ساعدني أختار منتجات' },
      ];
    case 'unknown':
      return [{ id: 'contact_support', label: '👨‍💻 تواصل مع محمد' }];
    default:
      return WELCOME_SUGGESTIONS;
  }
}
