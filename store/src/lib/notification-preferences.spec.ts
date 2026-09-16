import { describe, expect, it } from 'vitest';
import {
  formatTime12hAr,
  NOTIFICATION_CATEGORIES,
} from './notification-preferences';

describe('notification-preferences', () => {
  it('defines seven customer-facing categories with documented defaults', () => {
    expect(NOTIFICATION_CATEGORIES).toHaveLength(7);
    expect(NOTIFICATION_CATEGORIES.find((c) => c.key === 'orderUpdates')?.defaultEnabled).toBe(
      true,
    );
    expect(NOTIFICATION_CATEGORIES.find((c) => c.key === 'offers')?.defaultEnabled).toBe(false);
  });

  it('formats 24h times for Arabic display', () => {
    expect(formatTime12hAr('22:00')).toBe('10 م');
    expect(formatTime12hAr('08:00')).toBe('8 ص');
    expect(formatTime12hAr('08:30')).toBe('8:30 ص');
  });
});
