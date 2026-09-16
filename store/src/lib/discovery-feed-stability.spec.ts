import { describe, expect, it } from 'vitest';
import {
  buildFreeDeliveryDiscoveryQueryKey,
  buildStableDiscoveryQueryKey,
  collectDiscoveryProductIds,
  filterHomepageDiscoverySections,
  getFreeDeliveryStabilityKey,
  hasFreeDeliveryCartContext,
  mergeDiscoverySections,
} from './discovery-feed-stability';
import type { DiscoveryFeed, FreeDeliverySummary } from './types';

function summary(overrides: Partial<FreeDeliverySummary> = {}): FreeDeliverySummary {
  return {
    actualScore: 70,
    displayedScore: 70,
    target: 100,
    progressPercentage: 70,
    partialEnabled: false,
    partialThreshold: 0,
    partialDiscount: 0,
    originalDeliveryFee: 15,
    deliveryFee: 15,
    deliveryDiscount: 0,
    isFreeDelivery: false,
    isPartialFreeDelivery: false,
    areaEligibility: true,
    remainingScore: 30,
    subtotal: 100,
    totalItems: 2,
    itemCount: 2,
    ...overrides,
  };
}

describe('discovery-feed-stability', () => {
  it('builds stable discovery keys without cart state', () => {
    expect(buildStableDiscoveryQueryKey(null, true)).toEqual([
      'discovery-stable',
      'all',
      'auth',
    ]);
    expect(buildStableDiscoveryQueryKey('cat-1', false)).toEqual([
      'discovery-stable',
      'cat-1',
      'guest',
    ]);
  });

  it('builds free-delivery keys from progress buckets only', () => {
    expect(buildFreeDeliveryDiscoveryQueryKey(null, true, 'progress-60')).toEqual([
      'discovery-free-delivery',
      'all',
      'auth',
      'progress-60',
    ]);
  });

  it('buckets free-delivery progress without recomputing delivery logic', () => {
    expect(getFreeDeliveryStabilityKey(undefined)).toBe('none');
    expect(getFreeDeliveryStabilityKey(summary({ progressPercentage: 0 }))).toBe('none');
    expect(getFreeDeliveryStabilityKey(summary({ progressPercentage: 72 }))).toBe('progress-60');
    expect(getFreeDeliveryStabilityKey(summary({ progressPercentage: 74 }))).toBe('progress-60');
    expect(getFreeDeliveryStabilityKey(summary({ progressPercentage: 76 }))).toBe('progress-75');
    expect(getFreeDeliveryStabilityKey(summary({ progressPercentage: 96 }))).toBe('near-complete');
    expect(getFreeDeliveryStabilityKey(summary({ isFreeDelivery: true, progressPercentage: 100 }))).toBe(
      'achieved',
    );
  });

  it('detects when free-delivery recommendations may use cart context', () => {
    expect(
      hasFreeDeliveryCartContext({
        isAuthenticated: true,
        cartItemCount: 2,
        summary: summary({ progressPercentage: 70, remainingScore: 30 }),
      }),
    ).toBe(true);

    expect(
      hasFreeDeliveryCartContext({
        isAuthenticated: false,
        cartItemCount: 2,
        summary: summary(),
      }),
    ).toBe(false);

    expect(
      hasFreeDeliveryCartContext({
        isAuthenticated: true,
        cartItemCount: 0,
        summary: summary(),
      }),
    ).toBe(false);
  });

  it('merges stable sections with free-delivery section in display order', () => {
    const stable: DiscoveryFeed = {
      sections: [
        {
          sectionType: 'personalized',
          title: 'قد يعجبك',
          products: [{ id: 'a' } as DiscoveryFeed['sections'][number]['products'][number]],
        },
        {
          sectionType: 'most_ordered',
          title: 'الأكثر طلبًا',
          products: [{ id: 'd' } as DiscoveryFeed['sections'][number]['products'][number]],
        },
      ],
      meta: { hasPersonalData: true, hasCartContext: false },
    };

    const freeDelivery: DiscoveryFeed = {
      sections: [
        {
          sectionType: 'free_delivery_boost',
          title: 'توصيل مجاني',
          products: [{ id: 'b' } as DiscoveryFeed['sections'][number]['products'][number]],
        },
      ],
      meta: { hasPersonalData: true, hasCartContext: true },
    };

    const merged = mergeDiscoverySections(stable, freeDelivery);
    expect(merged.map((s) => s.sectionType)).toEqual([
      'personalized',
      'free_delivery_boost',
      'most_ordered',
    ]);
    expect(merged.map((s) => s.products[0]?.id)).toEqual(['a', 'b', 'd']);
  });

  it('filters homepage discovery to most_ordered then personalized only', () => {
    const sections = [
      {
        sectionType: 'personalized' as const,
        title: '✨ قد يعجبك',
        products: [{ id: 'p1' } as DiscoveryFeed['sections'][number]['products'][number]],
      },
      {
        sectionType: 'free_delivery_boost' as const,
        title: 'منتجات تساعدك في التوصيل المجاني',
        products: [{ id: 'fd1' } as DiscoveryFeed['sections'][number]['products'][number]],
      },
      {
        sectionType: 'most_ordered' as const,
        title: '🔥 الأكثر طلبًا',
        products: [{ id: 'm1' } as DiscoveryFeed['sections'][number]['products'][number]],
      },
      {
        sectionType: 'most_favorited' as const,
        title: 'المفضلة',
        products: [{ id: 'f1' } as DiscoveryFeed['sections'][number]['products'][number]],
      },
    ];

    const filtered = filterHomepageDiscoverySections(sections);
    expect(filtered.map((s) => s.sectionType)).toEqual(['most_ordered', 'personalized']);
    expect(filtered.find((s) => s.sectionType === 'personalized')?.title).toBe('✨ قد يعجبك');
    expect(collectDiscoveryProductIds(filterHomepageDiscoverySections(sections))).toEqual(
      new Set(['m1', 'p1']),
    );
  });
});
