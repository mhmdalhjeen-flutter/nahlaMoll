import { normalizeArabicForSearch } from '@/lib/help-faq-search';
import {
  isBasketBuilderQuery,
  parseBasketCategoryKeywords,
  parseBasketGoal,
  parseBudget,
  type BasketGoal,
} from './basket-builder';
import { looksLikeCategoryQuery } from './category-resolver';
import {
  isCookingKnowledgeQuery,
  isRecipeShoppingQuery,
  matchRecipe,
} from './recipe-catalog';
import { matchShoppingTheme } from './shopping-themes';

export type AssistantIntent =
  | 'product_search'
  | 'category_search'
  | 'natural_shopping'
  | 'recipe_shopping'
  | 'cooking_general'
  | 'basket_builder'
  | 'free_delivery'
  | 'order_status'
  | 'popular'
  | 'gift'
  | 'faq'
  | 'trivia'
  | 'support'
  | 'unknown';

export interface ParsedAssistantQuery {
  intent: AssistantIntent;
  searchTerm?: string;
  context?: string;
  faqQuery?: string;
  budget?: number;
  basketGoal?: BasketGoal;
  categoryKeywords?: string[];
  recipeId?: string;
  themeId?: string;
}

const ORDER_PATTERNS = [/وين\s*طلب/i, /طلبي/i, /متابعة\s*الطلب/i, /حالة\s*الطلب/i];
const FREE_DELIVERY_PATTERNS = [
  /توصيل\s*مجاني/i,
  /مجاني/i,
  /باقي\s*لي/i,
  /باقي\s*(\d+)\s*%/i,
  /كيف\s*اوصل/i,
  /كيف\s*أوصل/i,
];
const POPULAR_PATTERNS = [/اكثر\s*المنتجات/i, /أكثر\s*المنتجات/i, /الاكثر\s*طلب/i, /شائع/i, /طلبًا/i];
const GIFT_PATTERNS = [/هدية/i, /هديه/i, /أشتري\s*هدية/i];
const SUPPORT_PATTERNS = [
  /مشكلة\s*تقنية/i,
  /ما\s*اشتغل/i,
  /ما\s*شغال/i,
  /عطل/i,
  /خطأ\s*بال/i,
  /لا\s*يعمل/i,
];

const TRIVIA_ANSWERS: Record<string, string> = {
  'عاصمة فرنسا': 'باريس',
  'عاصمه فرنسا': 'باريس',
};

interface IntentMatcher {
  intent: AssistantIntent;
  test: (text: string, normalized: string) => boolean;
  parse?: (text: string, normalized: string) => Partial<ParsedAssistantQuery>;
}

/** Strip common Arabic filler words for cleaner search terms. */
export function extractProductSearchTerm(raw: string): string {
  const normalized = raw
    .replace(/[؟?!.،]/g, ' ')
    .replace(/\b(بدي|بدها|اريد|أريد|عايز|ممكن|منيح|منيحة|حلو|حلوة|لل|ل|في|على|شي|شيء)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length >= 2 ? normalized : raw.trim();
}

const INTENT_MATCHERS: IntentMatcher[] = [
  {
    intent: 'support',
    test: (text) => SUPPORT_PATTERNS.some((p) => p.test(text)),
    parse: () => ({ context: 'technical_support' }),
  },
  {
    intent: 'order_status',
    test: (text) => ORDER_PATTERNS.some((p) => p.test(text)),
  },
  {
    intent: 'basket_builder',
    test: (text) => isBasketBuilderQuery(text),
    parse: (text) => ({
      budget: parseBudget(text) ?? undefined,
      basketGoal: parseBasketGoal(text),
      categoryKeywords: parseBasketCategoryKeywords(text),
      context: parseBasketGoal(text),
    }),
  },
  {
    intent: 'recipe_shopping',
    test: (text) => isRecipeShoppingQuery(text) && !!matchRecipe(text),
    parse: (text) => ({
      recipeId: matchRecipe(text)?.id,
      context: matchRecipe(text)?.id,
    }),
  },
  {
    intent: 'cooking_general',
    test: (text) => isCookingKnowledgeQuery(text) && !!matchRecipe(text),
    parse: (text) => ({
      recipeId: matchRecipe(text)?.id,
      context: matchRecipe(text)?.id,
    }),
  },
  {
    intent: 'popular',
    test: (text) => POPULAR_PATTERNS.some((p) => p.test(text)),
  },
  {
    intent: 'gift',
    test: (text) => GIFT_PATTERNS.some((p) => p.test(text)),
    parse: (text) => ({
      searchTerm: extractProductSearchTerm(text),
      context: /زوجت/i.test(text)
        ? 'gift_for_wife'
        : /زوج/i.test(text)
          ? 'gift_for_husband'
          : 'gift',
    }),
  },
  {
    intent: 'free_delivery',
    test: (text) =>
      FREE_DELIVERY_PATTERNS.some((p) => p.test(text)) &&
      !/(منتج|سماع|هدية|بحث|دور|سلة|فواكه|خضار)/i.test(text),
  },
  {
    intent: 'natural_shopping',
    test: (text) => !!matchShoppingTheme(text),
    parse: (text) => {
      const theme = matchShoppingTheme(text)!;
      return {
        themeId: theme.id,
        context: theme.id,
        searchTerm: extractProductSearchTerm(text),
      };
    },
  },
  {
    intent: 'trivia',
    test: (_text, normalized) =>
      Object.keys(TRIVIA_ANSWERS).some((key) =>
        normalized.includes(normalizeArabicForSearch(key)),
      ),
    parse: (_text, normalized) => {
      for (const [key, answer] of Object.entries(TRIVIA_ANSWERS)) {
        if (normalized.includes(normalizeArabicForSearch(key))) {
          return { context: answer };
        }
      }
      return {};
    },
  },
  {
    intent: 'faq',
    test: (text) => /^(شو|ما|كيف|هل)\s/.test(text) && /(دفع|توصيل|طلب|عنوان)/i.test(text),
    parse: (text) => ({ faqQuery: text }),
  },
  {
    intent: 'category_search',
    test: (text) => {
      const term = extractProductSearchTerm(text);
      return looksLikeCategoryQuery(term) || looksLikeCategoryQuery(text.trim());
    },
    parse: (text) => ({
      searchTerm: extractProductSearchTerm(text) || text.trim(),
    }),
  },
];

export function resolveIntent(text: string): ParsedAssistantQuery {
  const trimmed = text.trim();
  const normalized = normalizeArabicForSearch(trimmed);

  if (!trimmed) {
    return { intent: 'unknown' };
  }

  for (const matcher of INTENT_MATCHERS) {
    if (!matcher.test(trimmed, normalized)) continue;
    const partial = matcher.parse?.(trimmed, normalized) ?? {};
    return { intent: matcher.intent, ...partial };
  }

  const searchTerm = extractProductSearchTerm(trimmed);
  return {
    intent: 'product_search',
    searchTerm,
    context: /جيم|رياض/i.test(trimmed)
      ? 'sport_gym'
      : /سماع/i.test(trimmed)
        ? 'headphones'
        : undefined,
  };
}

/** Backward-compatible alias used by existing imports. */
export function classifyAssistantQuery(text: string): ParsedAssistantQuery {
  return resolveIntent(text);
}
