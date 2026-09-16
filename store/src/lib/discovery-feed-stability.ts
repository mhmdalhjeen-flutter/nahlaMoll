import type { DiscoveryFeed, DiscoverySection, FreeDeliverySummary } from '@/lib/types';
import { FREE_DELIVERY_ELIGIBILITY_THRESHOLD } from '@/lib/delivery.constants';

const HOMEPAGE_DISCOVERY_ORDER = ['most_ordered', 'personalized'] as const;

/** Progress bucket size — free-delivery recommendations refresh only when crossing a bucket. */
export const FREE_DELIVERY_PROGRESS_BUCKET = 15;

export type DiscoverySectionType =
  | 'personalized'
  | 'free_delivery_boost'
  | 'most_ordered'
  | 'most_favorited';

export function buildStableDiscoveryQueryKey(
  categoryId: string | null | undefined,
  isAuthenticated: boolean,
): readonly ['discovery-stable', string, 'auth' | 'guest'] {
  return ['discovery-stable', categoryId ?? 'all', isAuthenticated ? 'auth' : 'guest'];
}

export function buildFreeDeliveryDiscoveryQueryKey(
  categoryId: string | null | undefined,
  isAuthenticated: boolean,
  stabilityKey: string,
): readonly ['discovery-free-delivery', string, 'auth' | 'guest', string] {
  return [
    'discovery-free-delivery',
    categoryId ?? 'all',
    isAuthenticated ? 'auth' : 'guest',
    stabilityKey,
  ];
}

/**
 * Buckets official cart progress so small cart edits do not refetch recommendations.
 * Uses DeliveryService-derived summary fields only — never computes its own percentage.
 */
export function getFreeDeliveryStabilityKey(
  summary: FreeDeliverySummary | undefined,
): string {
  if (!summary) return 'none';
  if (summary.isFreeDelivery) return 'achieved';

  const pct = summary.progressPercentage ?? 0;
  if (pct <= 0) return 'none';
  if (pct >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD) return 'near-complete';

  const bucket =
    Math.floor(pct / FREE_DELIVERY_PROGRESS_BUCKET) * FREE_DELIVERY_PROGRESS_BUCKET;
  return `progress-${bucket}`;
}

export function hasFreeDeliveryCartContext(input: {
  isAuthenticated: boolean;
  cartItemCount: number;
  summary: FreeDeliverySummary | undefined;
}): boolean {
  const { isAuthenticated, cartItemCount, summary } = input;
  if (!isAuthenticated || cartItemCount <= 0 || !summary) return false;
  if (summary.isFreeDelivery) return false;

  const pct = summary.progressPercentage ?? 0;
  const remaining = summary.remainingScore ?? 0;
  return pct > 0 && pct < FREE_DELIVERY_ELIGIBILITY_THRESHOLD && remaining > 0;
}

export function mergeDiscoverySections(
  stableFeed: DiscoveryFeed | undefined,
  freeDeliveryFeed: DiscoveryFeed | undefined,
): DiscoverySection[] {
  const stableSections =
    stableFeed?.sections.filter((s) => s.sectionType !== 'free_delivery_boost') ?? [];

  const freeDeliverySection = freeDeliveryFeed?.sections.find(
    (s) => s.sectionType === 'free_delivery_boost',
  );

  if (!freeDeliverySection || freeDeliverySection.products.length === 0) {
    return stableSections;
  }

  const merged = [...stableSections];
  const personalizedIndex = merged.findIndex((s) => s.sectionType === 'personalized');
  const insertAt = personalizedIndex >= 0 ? personalizedIndex + 1 : 0;
  merged.splice(insertAt, 0, freeDeliverySection);
  return merged;
}

export function getSectionProductIdsKey(section: DiscoverySection): string {
  return section.products.map((p) => p.id).join(',');
}

/** Homepage discovery sections in display order; excludes free-delivery boost and other feeds. */
export function filterHomepageDiscoverySections(sections: DiscoverySection[]): DiscoverySection[] {
  const allowed = sections.filter(
    (section) =>
      section.sectionType === 'most_ordered' || section.sectionType === 'personalized',
  );

  return HOMEPAGE_DISCOVERY_ORDER.map((sectionType) => {
    const section = allowed.find((s) => s.sectionType === sectionType);
    if (!section || section.products.length === 0) return undefined;
    if (sectionType === 'personalized') {
      return { ...section, title: '✨ قد يعجبك' };
    }
    return section;
  }).filter((section): section is DiscoverySection => !!section);
}

export function collectDiscoveryProductIds(sections: DiscoverySection[]): Set<string> {
  return new Set(sections.flatMap((section) => section.products.map((product) => product.id)));
}
