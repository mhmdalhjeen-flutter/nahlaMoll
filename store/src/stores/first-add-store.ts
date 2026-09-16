'use client';

import { create } from 'zustand';
import type { Product } from '@/lib/types';

export interface PendingCartAdd {
  product: Product;
  variantId?: string;
  quantity: number;
  savedAt?: number;
}

interface FirstAddState {
  modalOpen: boolean;
  /** Pending add while delivery-area modal is open */
  pending: PendingCartAdd | null;
  openModal: (pending: PendingCartAdd) => void;
  closeModal: () => void;
  clearPending: () => void;
}

export const useFirstAddStore = create<FirstAddState>()((set) => ({
  modalOpen: false,
  pending: null,
  openModal: (pending) => set({ modalOpen: true, pending }),
  closeModal: () => set({ modalOpen: false }),
  clearPending: () => set({ pending: null }),
}));
