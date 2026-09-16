'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/types';
import { clearTokens, setTokens } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setSession: (user: User) => void;
  setUser: (user: User) => void;
  setInitialized: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      setAuth: (user, accessToken, refreshToken) => {
        setTokens(accessToken, refreshToken);
        set({ user, isAuthenticated: true, isInitialized: true });
      },
      setSession: (user) => set({ user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setInitialized: (value) => set({ isInitialized: value }),
      logout: () => {
        clearTokens();
        set({ user: null, isAuthenticated: false, isInitialized: true });
      },
    }),
    {
      name: 'store-auth',
      /** Cache user display only — auth is driven by tokens + profile validation */
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = false;
          state.isInitialized = false;
        }
      },
    },
  ),
);

export function waitForAuthHydration(): Promise<void> {
  return new Promise((resolve) => {
    if (useAuthStore.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
