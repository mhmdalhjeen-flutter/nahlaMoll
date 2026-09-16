'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useAuthStore } from '@/stores/auth-store';
import { useCheckoutStore } from '@/stores/checkout-store';
import { useValidatedDeliveryArea } from '@/hooks/useValidatedDeliveryArea';
import { isDeliveryAreaNotFound } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';
import type { Product, ProductVariant } from '@/lib/types';
import {
  addToCartOptimistic,
  adjustCartItemQuantityOptimistic,
  buildCartQueryKey,
  setCartItemQuantityOptimistic,
} from '@/lib/cart-quantity-sync';

export function cartItemKey(productId: string, variantId?: string | null) {
  return `${productId}:${variantId ?? ''}`;
}

export function useCartQueryKey() {
  const { deliveryAreaId, areasReady } = useValidatedDeliveryArea();
  return buildCartQueryKey(areasReady, deliveryAreaId);
}

export function useCartMap() {
  const { isAuthenticated } = useAuthStore();
  const { deliveryAreaId, areasReady } = useValidatedDeliveryArea();
  const setDeliveryAreaId = useCheckoutStore((s) => s.setDeliveryAreaId);
  const qc = useQueryClient();
  const queryKey = buildCartQueryKey(areasReady, deliveryAreaId);

  const query = useQuery({
    queryKey: [...queryKey],
    queryFn: async () => {
      try {
        return await storeApi.getCart(deliveryAreaId ?? undefined);
      } catch (e) {
        if (isDeliveryAreaNotFound(e)) {
          setDeliveryAreaId(null);
          qc.invalidateQueries({ queryKey: ['cart'] });
          return storeApi.getCart();
        }
        throw e;
      }
    },
    enabled: isAuthenticated && areasReady,
    retry: (failureCount, error) => !isDeliveryAreaNotFound(error) && failureCount < 2,
  });

  const qtyMap = useMemo(() => {
    const map = new Map<string, { itemId: string; quantity: number; variantId?: string | null }>();
    for (const item of query.data?.items ?? []) {
      map.set(cartItemKey(item.productId, item.variantId), {
        itemId: item.id,
        quantity: item.quantity,
        variantId: item.variantId,
      });
    }
    return map;
  }, [query.data?.items]);

  return {
    ...query,
    qtyMap,
    summary: query.data?.summary,
    cartQueryKey: queryKey,
  };
}

export function useCartActions() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { deliveryAreaId, areasReady } = useValidatedDeliveryArea();
  const cartQueryKey = buildCartQueryKey(areasReady, deliveryAreaId);

  const syncCtx = {
    qc,
    queryKey: cartQueryKey,
    onError: (message: string) => toast(message, 'error'),
    onAddSuccess: () => toast('تمت الإضافة إلى السلة', 'success'),
  };

  const add = (
    productId: string,
    quantity = 1,
    variantId?: string,
    product?: Product,
    variant?: ProductVariant,
    options?: { silent?: boolean },
  ) => {
    return addToCartOptimistic(
      productId,
      quantity,
      variantId,
      product,
      variant,
      options?.silent ? { ...syncCtx, onAddSuccess: undefined } : syncCtx,
    );
  };

  const setQuantity = (itemId: string, quantity: number) => {
    setCartItemQuantityOptimistic(itemId, quantity, syncCtx);
  };

  const adjustQuantity = (itemId: string, delta: number) => {
    adjustCartItemQuantityOptimistic(itemId, delta, syncCtx);
  };

  return { add, setQuantity, adjustQuantity, deliveryAreaId, cartQueryKey };
}
