'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useStoreOpen } from '@/components/store/StoreStatus';
import { useClosedStoreStore } from '@/stores/closed-store-store';
import { useCartActions } from '@/hooks/useCartMap';
import { useValidatedDeliveryArea } from '@/hooks/useValidatedDeliveryArea';
import { useFirstAddStore } from '@/stores/first-add-store';
import { usePendingAuthStore } from '@/stores/pending-auth-store';
import { hasAcknowledgedClosedStoreWarning } from '@/lib/closed-store-session';
import type { Product, ProductVariant } from '@/lib/types';

export function useGuardedCartActions() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { isOpen, isLoading } = useStoreOpen();
  const showClosedModal = useClosedStoreStore((s) => s.show);
  const cartActions = useCartActions();
  const { deliveryAreaId, areasReady } = useValidatedDeliveryArea();
  const openFirstAddModal = useFirstAddStore((s) => s.openModal);
  const requestAuth = usePendingAuthStore((s) => s.requestAuth);

  const guardedAdd = (
    product: Product,
    variantId?: string,
    quantity = 1,
  ) => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      requestAuth({
        type: 'ADD_TO_CART',
        product,
        variantId,
        quantity,
        savedAt: Date.now(),
      });
      return;
    }

    if (areasReady && !deliveryAreaId) {
      openFirstAddModal({ product, variantId, quantity });
      return;
    }

    const variant: ProductVariant | undefined = variantId
      ? product.variants?.find((v) => v.id === variantId)
      : undefined;

    cartActions.add(product.id, quantity, variantId, product, variant);

    if (!isLoading && !isOpen && !hasAcknowledgedClosedStoreWarning()) {
      showClosedModal(
        {
          type: 'ADD_TO_CART',
          product,
          variantId,
          quantity,
        },
        'info',
      );
    }
  };

  return {
    ...cartActions,
    add: guardedAdd,
    isStoreOpen: isOpen,
    isStoreStatusLoading: isLoading,
  };
}
