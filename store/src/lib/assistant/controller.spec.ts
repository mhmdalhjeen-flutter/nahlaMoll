import { describe, expect, it, vi } from 'vitest';
import { runAssistantMessage } from './controller';
import type { AssistantEngineDeps } from './types';
import type { Category, Product } from '@/lib/types';

const categories: Category[] = [
  { id: 'c1', name: 'خضار', slug: 'vegetables' },
  { id: 'c2', name: 'فواكه', slug: 'fruits' },
];

function p(id: string, name: string, price: number, categoryId?: string): Product {
  return {
    id,
    name,
    description: name,
    price: String(price),
    freeDeliveryValue: '10',
    availability: 'LIMITED',
    stock: 5,
    isAvailable: true,
    isActive: true,
    isRecommended: false,
    images: [],
    categoryId,
  };
}

function mockDeps(overrides: Partial<AssistantEngineDeps> = {}): AssistantEngineDeps {
  return {
    searchProducts: vi.fn(async (q: string) => {
      if (/خيار|خضار/.test(q)) return [p('v1', 'خيار', 5, 'c1'), p('v2', 'بندورة', 6, 'c1')];
      if (/فواكه|تفاح/.test(q)) return [p('f1', 'تفاح', 20, 'c2'), p('f2', 'موز', 15, 'c2')];
      if (/سماع/.test(q)) return [p('e1', 'سماعة', 80)];
      if (/دجاج|باذنج|ارز|بصل|بهار/.test(q)) {
        return [p('i1', 'دجاج', 30), p('i2', 'باذنجان', 8), p('i3', 'أرز', 12)];
      }
      return [];
    }),
    getDiscoveryFeed: vi.fn(async () => ({
      sections: [
        {
          sectionType: 'most_ordered',
          products: [p('f1', 'تفاح', 20, 'c2'), p('f2', 'موز', 15, 'c2'), p('f3', 'برتقال', 18, 'c2')],
        },
      ],
    })),
    getCategories: vi.fn(async () => categories),
    getProducts: vi.fn(async ({ categoryId }) => ({
      products:
        categoryId === 'c1'
          ? [p('v1', 'خيار', 5, 'c1'), p('v2', 'بندورة', 6, 'c1')]
          : [p('f1', 'تفاح', 20, 'c2'), p('f2', 'موز', 15, 'c2')],
      total: 2,
      page: 1,
      pageSize: 40,
    })),
    getProduct: vi.fn(async (id: string) => p(id, 'منتج', 10)),
    ...overrides,
  };
}

describe('assistant controller', () => {
  it('returns compact category results for خضار', async () => {
    const turn = await runAssistantMessage('خضار', mockDeps(), { isAuthenticated: false });
    expect(turn.compactItems?.length).toBeGreaterThan(0);
    expect(turn.reply).toContain('خضار');
  });

  it('builds basket suggestions for fruit budget query', async () => {
    const turn = await runAssistantMessage('بدي تشكيلة فواكه بـ100 شيكل', mockDeps(), {
      isAuthenticated: false,
    });
    expect(turn.baskets?.length).toBeGreaterThan(0);
    expect(turn.basketCriteria?.budget).toBe(100);
  });

  it('handles recipe shopping when store has ingredients', async () => {
    const turn = await runAssistantMessage('شو بحتاج أشتري للمقلوبة؟', mockDeps(), {
      isAuthenticated: false,
    });
    expect(turn.compactItems?.length).toBeGreaterThan(0);
  });

  it('handles product search for سماعة', async () => {
    const turn = await runAssistantMessage('سماعة', mockDeps(), { isAuthenticated: false });
    expect(turn.compactItems?.length ?? turn.products?.length).toBeGreaterThan(0);
  });
});
