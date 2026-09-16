'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  placement: 'top' | 'bottom';
}

interface ToastState {
  toasts: Toast[];
  show: (
    message: string,
    type?: ToastType,
    action?: ToastAction,
    placement?: 'top' | 'bottom',
  ) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info', action, placement) => {
    const id = `${Date.now()}-${Math.random()}`;
    const resolvedPlacement =
      placement ?? (type === 'success' ? 'top' : 'bottom');
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id, message, type, action, placement: resolvedPlacement },
      ],
    }));
    const duration = action ? 6000 : 4000;
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
