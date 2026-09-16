'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { usePendingAuthStore } from '@/stores/pending-auth-store';
import type { PendingAuthAction } from '@/lib/pending-auth';

export function useProtectedAction() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const requestAuth = usePendingAuthStore((s) => s.requestAuth);

  const requireAuth = useCallback(
    (action: PendingAuthAction, execute: () => void) => {
      if (!isInitialized) return;
      if (!isAuthenticated) {
        requestAuth({ ...action, savedAt: Date.now() });
        return;
      }
      execute();
    },
    [isAuthenticated, isInitialized, requestAuth],
  );

  return { requireAuth, isAuthenticated, isInitialized };
}
