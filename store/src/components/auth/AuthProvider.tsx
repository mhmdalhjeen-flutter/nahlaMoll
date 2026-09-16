'use client';

import { useEffect } from 'react';
import { storeApi } from '@/lib/store-api';
import { getTokens, clearTokens } from '@/lib/api';
import { mergeCustomerSessionOnAuth } from '@/lib/customer-events';
import { useAuthStore, waitForAuthHydration } from '@/stores/auth-store';

/**
 * Restores the customer session on full page reload:
 * tokens in localStorage → validate via GET /users/profile
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await waitForAuthHydration();
      if (cancelled) return;

      const { access, refresh } = getTokens();

      if (!access || !refresh) {
        clearTokens();
        useAuthStore.getState().logout();
        return;
      }

      try {
        const profile = await storeApi.getProfile();
        if (cancelled) return;
        useAuthStore.getState().setSession(profile);
        useAuthStore.getState().setInitialized(true);
        void mergeCustomerSessionOnAuth();
      } catch {
        if (cancelled) return;
        useAuthStore.getState().logout();
      }
    }

    if (!isInitialized) {
      void bootstrap();
    }

    return () => {
      cancelled = true;
    };
  }, [isInitialized]);

  return <>{children}</>;
}
