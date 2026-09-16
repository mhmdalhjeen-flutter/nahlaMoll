'use client';

import axios from 'axios';
import { useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';
import { clearAdminTokens, getAdminTokens } from '@/lib/api';
import { useAdminAuth, waitForAdminAuthHydration } from '@/stores/auth-store';

/**
 * Restores the admin session on full page reload:
 * tokens in localStorage → validate via GET /admin/settings
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const isInitialized = useAdminAuth((s) => s.isInitialized);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await waitForAdminAuthHydration();
      if (cancelled) return;

      const { access, refresh } = getAdminTokens();
      const email = useAdminAuth.getState().email;

      if (!access || !refresh) {
        clearAdminTokens();
        useAdminAuth.getState().logout();
        return;
      }

      if (email) {
        useAdminAuth.getState().setSession(email);
      }

      try {
        await adminApi.getSettings();
        if (cancelled) return;
        useAdminAuth.getState().setInitialized(true);
      } catch (err) {
        if (cancelled) return;
        // Only explicit auth failures should clear the session.
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          useAdminAuth.getState().logout();
        } else {
          useAdminAuth.getState().setInitialized(true);
        }
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
