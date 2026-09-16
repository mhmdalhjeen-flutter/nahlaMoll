import type { Product } from '@/lib/types';

/** Backend OTP contract — 6 digits (`verify-otp.dto.ts`). */
export const AUTH_OTP_LENGTH = 6;

export const AUTH_PENDING_MAX_AGE_MS = 30 * 60 * 1000;

export type PendingAuthAction =
  | {
      type: 'ADD_TO_CART';
      product: Product;
      variantId?: string;
      quantity: number;
      savedAt?: number;
    }
  | {
      type: 'TOGGLE_FAVORITE';
      productId: string;
      addToFavorites: boolean;
      savedAt?: number;
    }
  | {
      type: 'PAGE_ACCESS';
      path: string;
      savedAt?: number;
    };

export function pendingActionKey(action: PendingAuthAction): string {
  switch (action.type) {
    case 'ADD_TO_CART':
      return `cart:${action.product.id}:${action.variantId ?? ''}:${action.quantity}`;
    case 'TOGGLE_FAVORITE':
      return `fav:${action.productId}:${action.addToFavorites ? '1' : '0'}`;
    case 'PAGE_ACCESS':
      return `page:${action.path}`;
  }
}

export function isPendingActionExpired(action: PendingAuthAction): boolean {
  const savedAt = action.savedAt ?? 0;
  return savedAt > 0 && Date.now() - savedAt > AUTH_PENDING_MAX_AGE_MS;
}
