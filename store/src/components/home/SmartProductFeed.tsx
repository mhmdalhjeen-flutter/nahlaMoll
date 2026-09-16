'use client';

import { useMemo } from 'react';
import {
  useStableDiscoveryFeed,
  type DiscoveryFeedSnapshot,
} from '@/hooks/useStableDiscoveryFeed';
import { filterHomepageDiscoverySections } from '@/lib/discovery-feed-stability';
import type { Product } from '@/lib/types';
import { ProductFeedSection, ProductFeedSectionSkeleton } from './ProductFeedSection';
import { ErrorState } from '@/components/ui/EmptyState';

type CartQtyMap = Map<string, { itemId: string; quantity: number; variantId?: string | null }>;

interface SmartProductFeedProps {
  selectedCategoryId: string | null;
  qtyMap: CartQtyMap;
  onAddToCart: (product: Product, variantId?: string) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
  /** When true, show a friendly error state instead of hiding failures. */
  showError?: boolean;
  /** Homepage shows most_ordered + personalized only, in that order. */
  mode?: 'default' | 'homepage';
  /** Skip cart-dependent free-delivery boost query (homepage default). */
  includeFreeDeliveryBoost?: boolean;
  /** Reuse discovery data from a parent hook instance (avoids duplicate subscriptions). */
  discoverySnapshot?: DiscoveryFeedSnapshot;
}

export function SmartProductFeed({
  selectedCategoryId,
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
  showError = false,
  mode = 'default',
  includeFreeDeliveryBoost = mode !== 'homepage',
  discoverySnapshot,
}: SmartProductFeedProps) {
  const internalDiscovery = useStableDiscoveryFeed({
    categoryId: selectedCategoryId,
    includeFreeDeliveryBoost,
    enabled: discoverySnapshot === undefined,
  });

  const { sections, isInitialLoading, isError, refetch } =
    discoverySnapshot ?? internalDiscovery;

  const displaySections = useMemo(() => {
    if (mode === 'homepage') {
      return filterHomepageDiscoverySections(sections);
    }
    return sections.filter((section) => section.sectionType !== 'free_delivery_boost');
  }, [mode, sections]);

  if (isInitialLoading) {
    return (
      <div className="container mx-auto px-4 max-w-6xl py-2">
        <ProductFeedSectionSkeleton />
        <ProductFeedSectionSkeleton />
      </div>
    );
  }

  if (isError) {
    if (!showError) return null;
    return (
      <ErrorState
        message="صار معنا مشكلة بسيطة، جرب مرة ثانية."
        onRetry={() => void refetch()}
      />
    );
  }

  if (displaySections.length === 0) return null;

  return (
    <div className="container mx-auto px-4 max-w-6xl py-2 md:py-4">
      {displaySections.map((section) => (
        <ProductFeedSection
          key={section.sectionType}
          section={section}
          qtyMap={qtyMap}
          onAddToCart={onAddToCart}
          onQuantityAdjust={onQuantityAdjust}
          onToggleFavorite={onToggleFavorite}
          favoriteIds={favoriteIds}
          recommendationContext={{ sectionType: section.sectionType }}
        />
      ))}
    </div>
  );
}
