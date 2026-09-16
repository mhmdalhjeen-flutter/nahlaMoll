import type { FaqCategory, FaqItem } from './help-faq';
import { FAQ_CATEGORIES, FAQ_ITEMS, resolveFaqAnswer, type FaqAnswerContext } from './help-faq';

/** Normalize Arabic for simple FAQ search (client-side). */
export function normalizeArabicForSearch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

export interface FaqSearchResult {
  category: FaqCategory;
  items: FaqItem[];
}

export function filterFaqItems(
  query: string,
  ctx: FaqAnswerContext,
): { results: FaqSearchResult[]; hasQuery: boolean } {
  const normalizedQuery = normalizeArabicForSearch(query);
  const hasQuery = normalizedQuery.length >= 1;

  if (!hasQuery) {
    return {
      hasQuery: false,
      results: FAQ_CATEGORIES.map((category) => ({
        category,
        items: FAQ_ITEMS.filter((item) => item.categoryId === category.id),
      })),
    };
  }

  const tokens = normalizedQuery.split(' ').filter(Boolean);

  const matchedItems = FAQ_ITEMS.filter((item) => {
    const answer = resolveFaqAnswer(item, ctx);
    const haystack = normalizeArabicForSearch(
      [item.question, answer, ...item.keywords].join(' '),
    );
    return tokens.every((token) => haystack.includes(token));
  });

  const results = FAQ_CATEGORIES.map((category) => ({
    category,
    items: matchedItems.filter((item) => item.categoryId === category.id),
  })).filter((group) => group.items.length > 0);

  return { results, hasQuery: true };
}
