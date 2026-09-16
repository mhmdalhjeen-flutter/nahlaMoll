import { create } from 'zustand';
import type { Product } from '@/lib/types';

export type ClosedStoreModalMode = 'info' | 'submit';

export type ClosedStorePendingAction =
  | {
      type: 'ADD_TO_CART';
      product: Product;
      variantId?: string;
      quantity?: number;
    }
  | {
      type: 'CHECKOUT';
      deliveryAreaId: string;
      deliveryAddress: string;
      notes?: string;
    };

interface ClosedStoreState {
  open: boolean;
  mode: ClosedStoreModalMode;
  pending: ClosedStorePendingAction | null;
  show: (pending: ClosedStorePendingAction, mode?: ClosedStoreModalMode) => void;
  close: () => void;
}

export const useClosedStoreStore = create<ClosedStoreState>((set) => ({
  open: false,
  mode: 'info',
  pending: null,
  show: (pending, mode = pending.type === 'CHECKOUT' ? 'submit' : 'info') =>
    set({ open: true, pending, mode }),
  close: () => set({ open: false, pending: null }),
}));
