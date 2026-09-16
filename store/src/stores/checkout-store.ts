'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CheckoutState {
  deliveryAreaId: string | null;
  deliveryAddress: string;
  deliveryNotes: string;
  setDeliveryAreaId: (id: string | null) => void;
  setDeliveryAddress: (address: string) => void;
  setDeliveryNotes: (notes: string) => void;
  saveDefaultDelivery: (payload: {
    deliveryAreaId: string;
    deliveryAddress: string;
    deliveryNotes?: string;
  }) => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      deliveryAreaId: null,
      deliveryAddress: '',
      deliveryNotes: '',
      setDeliveryAreaId: (id) => set({ deliveryAreaId: id }),
      setDeliveryAddress: (address) => set({ deliveryAddress: address }),
      setDeliveryNotes: (notes) => set({ deliveryNotes: notes }),
      saveDefaultDelivery: ({ deliveryAreaId, deliveryAddress, deliveryNotes = '' }) =>
        set({ deliveryAreaId, deliveryAddress, deliveryNotes }),
    }),
    { name: 'store-checkout' },
  ),
);
