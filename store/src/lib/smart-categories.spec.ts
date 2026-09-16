import { describe, expect, it } from 'vitest';
import {
  buildCategoryAffinityMaps,
  getSmartCategories,
  hasBehavioralCategoryData,
} from './smart-categories';
import type { Category, Favorite, CartItem } from './types';

const makeCategory = (id: string, name: string, products: number): Category => ({
  id,
  name,
  slug: id,
  _count: { products },
});

describe('getSmartCategories', () => {
  const categories: Category[] = [
    makeCategory('a', 'أ', 10),
    makeCategory('b', 'ب', 50),
    makeCategory('c', 'ج', 30),
    makeCategory('d', 'د', 0),
    { id: 'child', name: 'فرعي', slug: 'child', parentId: 'a', _count: { products: 5 } },
  ];

  it('excludes empty and child categories for guests', () => {
    const result = getSmartCategories(categories);
    expect(result.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('keeps stable ordering for equal scores', () => {
    const equal = [
      makeCategory('x', 'ألف', 5),
      makeCategory('y', 'باء', 5),
    ];
    const first = getSmartCategories(equal).map((c) => c.id);
    const second = getSmartCategories(equal).map((c) => c.id);
    expect(first).toEqual(second);
  });

  it('prioritizes affinity for returning users', () => {
    const favorites: Favorite[] = [
      {
        id: 'f1',
        productId: 'p1',
        product: { id: 'p1', categoryId: 'a' } as Favorite['product'],
      },
    ];
    const cartItems: CartItem[] = [
      {
        id: 'c1',
        quantity: 2,
        productId: 'p2',
        product: { id: 'p2', categoryId: 'c' } as CartItem['product'],
      },
    ];
    const maps = buildCategoryAffinityMaps({ favorites, cartItems });
    expect(hasBehavioralCategoryData(maps)).toBe(true);

    const result = getSmartCategories(categories, maps);
    expect(result[0]?.id).toBe('c');
  });
});

describe('hasBehavioralCategoryData', () => {
  it('returns false when data is insufficient', () => {
    const maps = buildCategoryAffinityMaps({
      favorites: [{ id: '1', productId: 'p', product: { id: 'p', categoryId: 'a' } as Favorite['product'] }],
    });
    expect(hasBehavioralCategoryData(maps)).toBe(false);
  });
});
