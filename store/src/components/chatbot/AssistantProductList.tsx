'use client';

import { useMemo } from 'react';
import type { Product } from '@/lib/types';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useCartMap } from '@/hooks/useCartMap';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useToastStore } from '@/stores/toast-store';
import { recordAssistantInteraction } from '@/lib/assistant/interactions';

interface AssistantProductListProps {
  products: Product[];
}

export function AssistantProductList({ products }: AssistantProductListProps) {
  const { qtyMap } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();
  const { requireAuth } = useProtectedAction();
  const { isAuthenticated } = useAuthStore();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();

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
      if (isFavorite) await storeApi.removeFavorite(product.id);
      else await storeApi.addFavorite(product.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
    onError: () => toast('تعذّر تحديث المفضلة', 'error'),
  });

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      <ProductGrid
        products={products}
        layout="row"
        qtyMap={qtyMap}
        onAddToCart={(product, variantId) => add(product, variantId)}
        onQuantityAdjust={(itemId, delta) => adjustQuantity(itemId, delta)}
        onToggleFavorite={(product) => {
          const isFavorite = favoriteIds.has(product.id);
          requireAuth(
            { type: 'TOGGLE_FAVORITE', productId: product.id, addToFavorites: !isFavorite },
            () => favoriteMutation.mutate({ product, isFavorite }),
          );
        }}
        favoriteIds={favoriteIds}
        onProductNavigate={(product) => {
          recordAssistantInteraction({
            type: 'CHAT_PRODUCT_CLICK',
            productId: product.id,
          });
        }}
      />
    </div>
  );
}
