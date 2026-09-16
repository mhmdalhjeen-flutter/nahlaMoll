import { describe, expect, it } from 'vitest';
import {
  buildBasketSuggestions,
  isBasketBuilderQuery,
  parseBasketGoal,
  parseBudget,
} from './basket-builder';
import type { Product } from '@/lib/types';

function mockProduct(id: string, name: string, price: number, fd = 10): Product {
  return {
    id,
    name,
    description: name,
    price: String(price),
    freeDeliveryValue: String(fd),
    availability: 'LIMITED',
    stock: 10,
    isAvailable: true,
    isActive: true,
    isRecommended: false,
    images: [],
  };
}

describe('basket-builder', () => {
  it('parses budget from Arabic text', () => {
    expect(parseBudget('بدي فواكه بـ100 شيكل')).toBe(100);
    expect(parseBudget('سلة ب 80')).toBe(80);
  });

  it('detects basket builder queries', () => {
    expect(isBasketBuilderQuery('بدي تشكيلة فواكه بـ100 شيكل')).toBe(true);
    expect(isBasketBuilderQuery('باقي لي 15%')).toBe(false);
  });

  it('parses value basket goal', () => {
    expect(parseBasketGoal('بدي أرخص سلة فواكه')).toBe('value');
    expect(parseBasketGoal('بدي أكثر تشكيلة')).toBe('max_variety');
  });

  it('builds multiple basket suggestions from real prices', () => {
    const products = [
      mockProduct('p1', 'تفاح', 20),
      mockProduct('p2', 'موز', 15),
      mockProduct('p3', 'برتقال', 18),
      mockProduct('p4', 'عنب', 25),
      mockProduct('p5', 'كيوي', 22),
    ];

    const baskets = buildBasketSuggestions(products, {
      budget: 100,
      goal: 'variety',
    });

    expect(baskets.length).toBeGreaterThanOrEqual(2);
    for (const basket of baskets) {
      expect(basket.total).toBeGreaterThan(0);
      expect(basket.lines.every((l) => l.unitPrice > 0)).toBe(true);
      const recomputed = basket.lines.reduce((s, l) => s + l.lineTotal, 0);
      expect(Math.abs(recomputed - basket.total)).toBeLessThan(0.02);
    }
  });

  it('returns empty when no purchasable products', () => {
    const out = buildBasketSuggestions([], { budget: 100, goal: 'variety' });
    expect(out).toEqual([]);
  });
});
