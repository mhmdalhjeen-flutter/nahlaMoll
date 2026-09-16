import { describe, expect, it } from 'vitest';
import type { CustomerNotification } from './types';
import {
  countUnread,
  formatRelativeTimeAr,
  getNotificationHref,
  groupNotificationsByDay,
} from './notifications';

function n(partial: Partial<CustomerNotification> & Pick<CustomerNotification, 'id'>): CustomerNotification {
  return {
    type: 'order',
    title: 'test',
    message: 'msg',
    createdAt: new Date().toISOString(),
    isRead: false,
    targetType: 'none',
    ...partial,
  };
}

describe('notifications utils', () => {
  const now = new Date('2026-09-06T15:00:00.000Z');

  it('groups by local calendar day', () => {
    const todayIso = '2026-09-06T10:00:00.000Z';
    const yesterdayIso = '2026-09-05T10:00:00.000Z';
    const groups = groupNotificationsByDay(
      [n({ id: '1', createdAt: yesterdayIso }), n({ id: '2', createdAt: todayIso })],
      now,
    );
    expect(groups.today.map((x) => x.id)).toEqual(['2']);
    expect(groups.earlier.map((x) => x.id)).toEqual(['1']);
  });

  it('formats relative minutes and hours', () => {
    expect(formatRelativeTimeAr('2026-09-06T14:50:00.000Z', now)).toBe('منذ 10 دقائق');
    expect(formatRelativeTimeAr('2026-09-06T14:00:00.000Z', now)).toBe('منذ ساعة');
    expect(formatRelativeTimeAr('2026-09-06T12:00:00.000Z', now)).toBe('منذ 3 ساعات');
  });

  it('formats yesterday', () => {
    expect(formatRelativeTimeAr('2026-09-05T16:00:00.000Z', now)).toBe('أمس');
  });

  it('counts unread', () => {
    expect(countUnread([n({ id: '1', isRead: false }), n({ id: '2', isRead: true })])).toBe(1);
  });

  it('resolves order and product hrefs from target fields', () => {
    expect(
      getNotificationHref(
        n({ id: '1', targetType: 'order', targetId: 'ord-1' }),
      ),
    ).toBe('/orders/ord-1');
    expect(
      getNotificationHref(
        n({ id: '2', targetType: 'product', targetId: 'prod-1' }),
      ),
    ).toBe('/products/prod-1');
  });

  it('returns null for missing target id', () => {
    expect(getNotificationHref(n({ id: '1', targetType: 'order', targetId: null }))).toBeNull();
  });
});
