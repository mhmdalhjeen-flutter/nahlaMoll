import { describe, expect, it } from 'vitest';
import { filterFaqItems, normalizeArabicForSearch } from './help-faq-search';
import { FAQ_ITEMS } from './help-faq';
import type { PublicPaymentConfig } from './types';

const mockPayment: PublicPaymentConfig = {
  cod: { enabled: true, note: null },
  methods: {
    bankOfPalestine: null,
    palPay: { accountName: 'Test', accountNumber: '123' },
    jawwalPay: null,
  },
};

describe('normalizeArabicForSearch', () => {
  it('normalizes alef variants', () => {
    expect(normalizeArabicForSearch('إأآا')).toBe('اااا');
  });

  it('collapses whitespace', () => {
    expect(normalizeArabicForSearch('  توصيل   مجاني  ')).toBe('توصيل مجاني');
  });
});

describe('filterFaqItems', () => {
  it('returns all categories when query is empty', () => {
    const { hasQuery, results } = filterFaqItems('', {});
    expect(hasQuery).toBe(false);
    expect(results).toHaveLength(4);
    expect(results[0].items.length).toBeGreaterThan(0);
  });

  it('filters by question keyword', () => {
    const { results, hasQuery } = filterFaqItems('التوصيل', {});
    expect(hasQuery).toBe(true);
    const ids = results.flatMap((r) => r.items.map((i) => i.id));
    expect(ids).toContain('fd-how');
  });

  it('hides empty categories when searching', () => {
    const { results } = filterFaqItems('محفظة', { paymentConfig: mockPayment });
    const categoryIds = results.map((r) => r.category.id);
    expect(categoryIds).not.toContain('free-delivery');
    expect(categoryIds).toContain('payment');
  });

  it('returns no results for unrelated query', () => {
    const { results } = filterFaqItems('xyznotfound123', {});
    expect(results).toHaveLength(0);
  });

  it('matches answer content', () => {
    const { results } = filterFaqItems('طلباتي', {});
    const ids = results.flatMap((r) => r.items.map((i) => i.id));
    expect(ids).toContain('ord-track');
  });

  it('covers all FAQ items in full list', () => {
    expect(FAQ_ITEMS).toHaveLength(12);
  });
});
