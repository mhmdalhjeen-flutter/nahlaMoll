'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PendingAuthAction } from '@/lib/pending-auth';

interface PendingAuthState {
  pendingAction: PendingAuthAction | null;
  authSheetOpen: boolean;
  requestAuth: (action: PendingAuthAction) => void;
  /** Close sheet; clears pending action unless authentication succeeded. */
  closeAuthSheet: (success?: boolean) => void;
  clearPendingAction: () => void;
}

export const usePendingAuthStore = create<PendingAuthState>()(
  persist(
    (set, get) => ({
      pendingAction: null,
      authSheetOpen: false,
      requestAuth: (action) => {
        set({
          pendingAction: { ...action, savedAt: action.savedAt ?? Date.now() },
          authSheetOpen: true,
        });
      },
      closeAuthSheet: (success = false) => {
        if (success) {
          set({ authSheetOpen: false });
          return;
        }
        set({ authSheetOpen: false, pendingAction: null });
      },
      clearPendingAction: () => set({ pendingAction: null }),
    }),
    {
      name: 'store-pending-auth',
      partialize: (state) => ({ pendingAction: state.pendingAction }),
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/** Non-React access for API interceptors. */
export function openAuthSheetForPageAccess(path: string) {
  usePendingAuthStore.getState().requestAuth({
    type: 'PAGE_ACCESS',
    path,
    savedAt: Date.now(),
  });
}
