import { describe, expect, it } from 'vitest';
import {
  AUTH_OTP_LENGTH,
  isPendingActionExpired,
  pendingActionKey,
} from './pending-auth';

describe('pending-auth', () => {
  it('uses 6-digit OTP contract', () => {
    expect(AUTH_OTP_LENGTH).toBe(6);
  });

  it('builds stable pending action keys', () => {
    expect(
      pendingActionKey({
        type: 'ADD_TO_CART',
        product: { id: 'p1' } as never,
        variantId: 'v1',
        quantity: 3,
      }),
    ).toBe('cart:p1:v1:3');
  });

  it('expires stale pending actions', () => {
    const expired = isPendingActionExpired({
      type: 'PAGE_ACCESS',
      path: '/cart',
      savedAt: Date.now() - 31 * 60 * 1000,
    });
    expect(expired).toBe(true);
  });
});
