'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useCartMap } from '@/hooks/useCartMap';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import type { Product } from '@/lib/types';
import { StoreClosedBanner } from '@/components/store/StoreStatus';
import { HomeIntroBox } from '@/components/home/HomeIntroBox';
import { FreeDeliveryIntro } from '@/components/home/FreeDeliveryIntro';
import { HomeHowItWorks } from '@/components/home/HomeHowItWorks';
import { HomeDiscoveryFeed } from '@/components/home/HomeDiscoveryFeed';
import { ErrorState } from '@/components/ui/EmptyState';

export default function HomePage() {
  const { qtyMap } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();
  const { requireAuth } = useProtectedAction();
  const { isAuthenticated } = useAuthStore();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();

  const {
    data: categories,
    isLoading: catLoading,
    error: catError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: storeApi.getCategories,
  });

  const { data: favoritesPage } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => storeApi.getFavorites({ limit: 100 }),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const favoriteIds = useMemo(
    () => new Set((favoritesPage?.items ?? []).map((f) => f.productId)),
    [favoritesPage],
  );

  const favoriteMutation = useMutation({
    mutationFn: async ({ product, isFavorite }: { product: Product; isFavorite: boolean }) => {
      if (isFavorite) {
        await storeApi.removeFavorite(product.id);
      } else {
        await storeApi.addFavorite(product.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: () => toast('تعذّر تحديث المفضلة', 'error'),
  });

  const handleAddToCart = (product: Product, variantId?: string) => {
    add(product, variantId);
  };

  const handleQuantityAdjust = (itemId: string, delta: number) => {
    adjustQuantity(itemId, delta);
  };

  const handleToggleFavorite = (product: Product) => {
    const isFavorite = favoriteIds.has(product.id);
    requireAuth(
      {
        type: 'TOGGLE_FAVORITE',
        productId: product.id,
        addToFavorites: !isFavorite,
      },
      () => favoriteMutation.mutate({ product, isFavorite }),
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <StoreClosedBanner />

      {catError ? (
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <ErrorState message="تعذّر تحميل التصنيفات" onRetry={() => refetchCategories()} />
        </div>
      ) : (
        <>
          <HomeIntroBox categories={categories ?? []} loading={catLoading} />
          <FreeDeliveryIntro />
          <HomeHowItWorks />
          <HomeDiscoveryFeed
            qtyMap={qtyMap}
            onAddToCart={handleAddToCart}
            onQuantityAdjust={handleQuantityAdjust}
            onToggleFavorite={handleToggleFavorite}
            favoriteIds={favoriteIds}
          />
        </>
      )}
    </div>
  );
}
