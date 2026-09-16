'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useAuthStore } from '@/stores/auth-store';
import { useCartMap } from '@/hooks/useCartMap';
import {
  buildFreeDeliveryDiscoveryQueryKey,
  buildStableDiscoveryQueryKey,
  getFreeDeliveryStabilityKey,
  hasFreeDeliveryCartContext,
  mergeDiscoverySections,
} from '@/lib/discovery-feed-stability';

const STABLE_STALE_MS = 5 * 60 * 1000;
const STABLE_GC_MS = 30 * 60 * 1000;

interface UseStableDiscoveryFeedOptions {
  categoryId?: string | null;
  enabled?: boolean;
  limit?: number;
  /** When false, skips the cart-dependent free-delivery boost query entirely. */
  includeFreeDeliveryBoost?: boolean;
}

export type DiscoveryFeedSnapshot = Pick<
  ReturnType<typeof useStableDiscoveryFeed>,
  'sections' | 'isInitialLoading' | 'isError' | 'refetch'
>;

export function useStableDiscoveryFeed(options: UseStableDiscoveryFeedOptions = {}) {
  const {
    categoryId = null,
    enabled = true,
    limit = 8,
    includeFreeDeliveryBoost = true,
  } = options;
  const { isAuthenticated } = useAuthStore();
  const { data: cartData } = useCartMap();
  const summary = cartData?.summary;

  const cartProductIds = useMemo(
    () => (cartData?.items ?? []).map((item) => item.productId).join(','),
    [cartData?.items],
  );

  const stabilityKey = getFreeDeliveryStabilityKey(summary);
  const showFreeDeliveryContext = hasFreeDeliveryCartContext({
    isAuthenticated,
    cartItemCount: cartData?.items?.length ?? 0,
    summary,
  });

  const stableQuery = useQuery({
    queryKey: buildStableDiscoveryQueryKey(categoryId, isAuthenticated),
    queryFn: () =>
      storeApi.getDiscoveryFeed({
        categoryId: categoryId ?? undefined,
        limit,
      }),
    enabled,
    staleTime: STABLE_STALE_MS,
    gcTime: STABLE_GC_MS,
    placeholderData: (previous) => previous,
  });

  const freeDeliveryQuery = useQuery({
    queryKey: buildFreeDeliveryDiscoveryQueryKey(
      categoryId,
      isAuthenticated,
      stabilityKey,
    ),
    queryFn: () =>
      storeApi.getDiscoveryFeed({
        categoryId: categoryId ?? undefined,
        cartProductIds: cartProductIds || undefined,
        displayProgress: summary?.progressPercentage,
        remainingScore: summary?.remainingScore,
        limit,
        sections: 'free_delivery_boost',
      }),
    enabled:
      enabled &&
      includeFreeDeliveryBoost &&
      showFreeDeliveryContext &&
      stabilityKey !== 'none' &&
      stabilityKey !== 'achieved',
    staleTime: STABLE_STALE_MS,
    gcTime: STABLE_GC_MS,
    placeholderData: (previous) => previous,
  });

  const sections = useMemo(() => {
    const merged = mergeDiscoverySections(stableQuery.data, freeDeliveryQuery.data);
    if (includeFreeDeliveryBoost) return merged;
    return merged.filter((section) => section.sectionType !== 'free_delivery_boost');
  }, [stableQuery.data, freeDeliveryQuery.data, includeFreeDeliveryBoost]);

  const isInitialLoading = stableQuery.isLoading && !stableQuery.data;

  return {
    sections,
    meta: stableQuery.data?.meta,
    isInitialLoading,
    isError: stableQuery.isError,
    refetch: async () => {
      await Promise.all([stableQuery.refetch(), freeDeliveryQuery.refetch()]);
    },
  };
}
