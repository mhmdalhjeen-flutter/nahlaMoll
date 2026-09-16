'use client';

import { useMemo } from 'react';
import { useStableDiscoveryFeed } from '@/hooks/useStableDiscoveryFeed';
import {
  collectDiscoveryProductIds,
  filterHomepageDiscoverySections,
} from '@/lib/discovery-feed-stability';
import type { Product } from '@/lib/types';
import { SmartProductFeed } from './SmartProductFeed';
import { HomeGeneralFeed } from './HomeGeneralFeed';

type CartQtyMap = Map<string, { itemId: string; quantity: number; variantId?: string | null }>;

interface HomeDiscoveryFeedProps {
  qtyMap: CartQtyMap;
  onAddToCart: (product: Product, variantId?: string) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
}

/** Homepage discovery sections + diverse general feed. */
export function HomeDiscoveryFeed({
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
}: HomeDiscoveryFeedProps) {
  const discovery = useStableDiscoveryFeed({
    categoryId: null,
    includeFreeDeliveryBoost: false,
  });

  const homepageSections = useMemo(
    () => filterHomepageDiscoverySections(discovery.sections),
    [discovery.sections],
  );

  const excludeProductIds = useMemo(
    () => collectDiscoveryProductIds(homepageSections),
    [homepageSections],
  );

  return (
    <div id="home-feed" className="scroll-mt-16">
      <SmartProductFeed
        mode="homepage"
        selectedCategoryId={null}
        qtyMap={qtyMap}
        onAddToCart={onAddToCart}
        onQuantityAdjust={onQuantityAdjust}
        onToggleFavorite={onToggleFavorite}
        favoriteIds={favoriteIds}
        includeFreeDeliveryBoost={false}
        discoverySnapshot={discovery}
      />
      <HomeGeneralFeed
        excludeProductIds={excludeProductIds}
        qtyMap={qtyMap}
        onAddToCart={onAddToCart}
        onQuantityAdjust={onQuantityAdjust}
        onToggleFavorite={onToggleFavorite}
        favoriteIds={favoriteIds}
      />
    </div>
  );
}
