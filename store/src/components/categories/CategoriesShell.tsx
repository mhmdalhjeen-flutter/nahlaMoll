'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useCartMap } from '@/hooks/useCartMap';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import type { Category, Product } from '@/lib/types';
import { StoreClosedBanner } from '@/components/store/StoreStatus';
import { SmartCategoriesBar } from '@/components/categories/SmartCategoriesBar';
import { ErrorState } from '@/components/ui/EmptyState';
import {
  buildCategoryAffinityMaps,
  hasBehavioralCategoryData,
  type CategoryAffinityMaps,
} from '@/lib/smart-categories';

interface CategoriesSharedData {
  categories: Category[];
  catLoading: boolean;
  catError: Error | null;
  refetchCategories: () => void;
  affinityMaps: CategoryAffinityMaps;
  hasBehavioralData: boolean;
  favoriteIds: Set<string>;
}

const CategoriesSharedContext = createContext<CategoriesSharedData | null>(null);

function useCategoriesSharedData(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { isAuthenticated } = useAuthStore();
  const { data: cartData } = useCartMap();

  const {
    data: categories,
    isLoading: catLoading,
    error: catError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: storeApi.getCategories,
    enabled,
  });

  const { data: favoritesPage } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => storeApi.getFavorites({ limit: 100 }),
    enabled: enabled && isAuthenticated,
    staleTime: 60_000,
  });

  const { data: ordersPage } = useQuery({
    queryKey: ['orders'],
    queryFn: () => storeApi.getOrders({ limit: 100 }),
    enabled: enabled && isAuthenticated,
    staleTime: 120_000,
  });

  const favorites = favoritesPage?.items;
  const orders = ordersPage?.items;

  const affinityMaps = useMemo(
    () =>
      buildCategoryAffinityMaps({
        favorites,
        cartItems: cartData?.items,
        orders,
      }),
    [favorites, cartData?.items, orders],
  );

  const favoriteIds = useMemo(
    () => new Set((favorites ?? []).map((f) => f.productId)),
    [favorites],
  );

  return {
    categories: categories ?? [],
    catLoading,
    catError: catError as Error | null,
    refetchCategories,
    affinityMaps,
    hasBehavioralData: hasBehavioralCategoryData(affinityMaps),
    favoriteIds,
  };
}

interface CategoriesShellProps {
  activeSlug: string | null;
  children?: React.ReactNode;
}

/** Shared categories page shell: category navigation + selected category content only. */
export function CategoriesShell({ activeSlug, children }: CategoriesShellProps) {
  const shared = useCategoriesSharedData({ enabled: true });

  return (
    <CategoriesSharedContext.Provider value={shared}>
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <StoreClosedBanner />

        {shared.catError ? (
          <div className="container mx-auto px-4 py-6 max-w-6xl">
            <ErrorState
              message="صار معنا مشكلة بسيطة، جرب مرة ثانية."
              onRetry={() => shared.refetchCategories()}
            />
          </div>
        ) : (
          <SmartCategoriesBar
            categories={shared.categories}
            activeSlug={activeSlug}
            affinityMaps={shared.affinityMaps}
            loading={shared.catLoading}
          />
        )}

        {children && (
          <div className="container mx-auto px-4 max-w-6xl py-4 pb-10">{children}</div>
        )}
      </div>
    </CategoriesSharedContext.Provider>
  );
}

export function useCategoriesPageActions() {
  const fromContext = useContext(CategoriesSharedContext);
  const fallbackShared = useCategoriesSharedData({ enabled: !fromContext });
  const shared = fromContext ?? fallbackShared;

  const { qtyMap } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();
  const { requireAuth } = useProtectedAction();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();

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
    const isFavorite = shared.favoriteIds.has(product.id);
    requireAuth(
      {
        type: 'TOGGLE_FAVORITE',
        productId: product.id,
        addToFavorites: !isFavorite,
      },
      () => favoriteMutation.mutate({ product, isFavorite }),
    );
  };

  return {
    categories: shared.categories,
    catLoading: shared.catLoading,
    qtyMap,
    favoriteIds: shared.favoriteIds,
    affinityMaps: shared.affinityMaps,
    hasBehavioralData: shared.hasBehavioralData,
    handleAddToCart,
    handleQuantityAdjust,
    handleToggleFavorite,
  };
}
