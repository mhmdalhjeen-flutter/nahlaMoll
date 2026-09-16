'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { usePendingAuthStore } from '@/stores/pending-auth-store';
import { useValidatedDeliveryArea } from '@/hooks/useValidatedDeliveryArea';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import { useToastStore } from '@/stores/toast-store';
import { storeApi } from '@/lib/store-api';
import { getErrorMessage } from '@/lib/utils';
import {
  isPendingActionExpired,
  pendingActionKey,
} from '@/lib/pending-auth';

/**
 * After in-place authentication, replays the deferred protected action once.
 */
export function PendingAuthActionResume() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const pendingAction = usePendingAuthStore((s) => s.pendingAction);
  const authSheetOpen = usePendingAuthStore((s) => s.authSheetOpen);
  const clearPendingAction = usePendingAuthStore((s) => s.clearPendingAction);
  const { areasReady } = useValidatedDeliveryArea();
  const { add, isStoreStatusLoading } = useGuardedCartActions();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const executedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      executedKeyRef.current = null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (
      !isInitialized ||
      !isAuthenticated ||
      !pendingAction ||
      authSheetOpen
    ) {
      return;
    }

    if (isPendingActionExpired(pendingAction)) {
      clearPendingAction();
      return;
    }

    const key = pendingActionKey(pendingAction);
    if (executedKeyRef.current === key) {
      return;
    }

    const run = async () => {
      executedKeyRef.current = key;
      const snapshot = pendingAction;
      clearPendingAction();

      try {
        switch (snapshot.type) {
          case 'ADD_TO_CART': {
            if (!areasReady || isStoreStatusLoading) {
              executedKeyRef.current = null;
              return;
            }
            add(snapshot.product, snapshot.variantId, snapshot.quantity);
            break;
          }
          case 'TOGGLE_FAVORITE': {
            if (snapshot.addToFavorites) {
              await storeApi.addFavorite(snapshot.productId);
              toast('تمت الإضافة إلى المفضلة', 'success');
            } else {
              await storeApi.removeFavorite(snapshot.productId);
              toast('تمت الإزالة من المفضلة', 'info');
            }
            qc.invalidateQueries({ queryKey: ['favorites'] });
            qc.invalidateQueries({ queryKey: ['favorite', snapshot.productId] });
            break;
          }
          case 'PAGE_ACCESS':
            break;
        }
      } catch (e) {
        executedKeyRef.current = null;
        toast(getErrorMessage(e), 'error');
      }
    };

    void run();
  }, [
    isInitialized,
    isAuthenticated,
    pendingAction,
    authSheetOpen,
    areasReady,
    isStoreStatusLoading,
    clearPendingAction,
    add,
    toast,
    qc,
  ]);

  return null;
}
