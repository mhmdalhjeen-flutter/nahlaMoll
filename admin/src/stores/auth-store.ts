'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearAdminTokens, setAdminTokens } from '@/lib/api';

interface AdminAuthState {
  isAuthenticated: boolean;
  email: string | null;
  isInitialized: boolean;
  setAuth: (email: string, accessToken: string, refreshToken: string) => void;
  setSession: (email: string) => void;
  setInitialized: (value: boolean) => void;
  logout: () => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      email: null,
      isInitialized: false,
      setAuth: (email, accessToken, refreshToken) => {
        setAdminTokens(accessToken, refreshToken);
        set({ isAuthenticated: true, email, isInitialized: true });
      },
      setSession: (email) => set({ isAuthenticated: true, email }),
      setInitialized: (value) => set({ isInitialized: value }),
      logout: () => {
        clearAdminTokens();
        set({ isAuthenticated: false, email: null, isInitialized: true });
      },
    }),
    {
      name: 'admin-auth',
      partialize: (s) => ({ email: s.email }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = false;
          state.isInitialized = false;
        }
      },
    },
  ),
);

export function waitForAdminAuthHydration(): Promise<void> {
  return new Promise((resolve) => {
    if (useAdminAuth.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = useAdminAuth.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
