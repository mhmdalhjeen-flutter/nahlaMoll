import type { QueryClient } from '@tanstack/react-query';
import type {
  CustomerNotification,
  CustomerNotificationTargetType,
  CustomerNotificationType,
  PaginatedList,
} from './types';

export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = [
  'notifications-unread-count',
] as const;

export const DEFAULT_NOTIFICATIONS_PAGE = 1;
export const DEFAULT_NOTIFICATIONS_LIMIT = 20;

export function notificationsListQueryKey(
  page = DEFAULT_NOTIFICATIONS_PAGE,
  limit = DEFAULT_NOTIFICATIONS_LIMIT,
) {
  return ['notifications', page, limit] as const;
}

/** Remove cached notification data on logout (customer-scoped). */
export function clearNotificationQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ['notifications'] });
  queryClient.removeQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });
}

export interface NotificationGroups {
  today: CustomerNotification[];
  earlier: CustomerNotification[];
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function groupNotificationsByDay(
  items: CustomerNotification[],
  now: Date = new Date(),
): NotificationGroups {
  const todayStart = startOfLocalDay(now).getTime();
  const today: CustomerNotification[] = [];
  const earlier: CustomerNotification[] = [];

  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  for (const item of sorted) {
    const ts = new Date(item.createdAt).getTime();
    if (ts >= todayStart) today.push(item);
    else earlier.push(item);
  }

  return { today, earlier };
}

export function countUnread(notifications: CustomerNotification[]): number {
  return notifications.filter((n) => !n.isRead).length;
}

/** Arabic relative time — no external date library. */
export function formatRelativeTimeAr(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const todayStart = startOfLocalDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const dateStart = startOfLocalDay(date);

  if (dateStart.getTime() === todayStart.getTime()) {
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return 'الآن';
    if (diffMin < 60) return `منذ ${diffMin} ${diffMin === 1 ? 'دقيقة' : 'دقائق'}`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours === 1) return 'منذ ساعة';
    if (diffHours === 2) return 'منذ ساعتين';
    return `منذ ${diffHours} ساعات`;
  }

  if (dateStart.getTime() === yesterdayStart.getTime()) return 'أمس';

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 2) return 'منذ يومين';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;

  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getNotificationHref(notification: CustomerNotification): string | null {
  const { targetType, targetId, type, title } = notification;
  if (!targetId && targetType !== 'cart' && targetType !== 'none') return null;

  switch (targetType as CustomerNotificationTargetType) {
    case 'order':
      return targetId ? `/orders/${targetId}` : null;
    case 'product':
      return targetId ? `/products/${targetId}` : null;
    case 'offer':
      return targetId ? `/products/${targetId}` : '/products?section=offers';
    case 'cart':
      return '/cart';
    case 'none':
      if (type === 'system' && title === 'رد الدعم الفني') {
        return '/support';
      }
      if (type === 'system' && title === 'إعلان جديد') {
        return '/announcements';
      }
      return null;
    default:
      return null;
  }
}

export function patchNotificationListRead(
  list: PaginatedList<CustomerNotification> | undefined,
  notificationId: string,
): PaginatedList<CustomerNotification> | undefined {
  if (!list) return list;

  return {
    ...list,
    items: list.items.map((item) =>
      item.id === notificationId ? { ...item, isRead: true } : item,
    ),
  };
}

export function patchNotificationListAllRead(
  list: PaginatedList<CustomerNotification> | undefined,
): PaginatedList<CustomerNotification> | undefined {
  if (!list) return list;

  return {
    ...list,
    items: list.items.map((item) => ({ ...item, isRead: true })),
  };
}

export type NotificationVisualTone = 'default' | 'success' | 'warning';

export function getNotificationVisualTone(
  type: CustomerNotificationType,
): NotificationVisualTone {
  switch (type) {
    case 'free_delivery':
      return 'success';
    case 'delivery':
      return 'default';
    case 'order':
      return 'default';
    case 'favorite':
    case 'offer':
      return 'warning';
    default:
      return 'default';
  }
}

export function getNotificationTypeLabel(type: CustomerNotificationType): string {
  switch (type) {
    case 'order':
      return 'طلب';
    case 'delivery':
      return 'توصيل';
    case 'free_delivery':
      return 'توصيل مجاني';
    case 'favorite':
      return 'مفضلة';
    case 'offer':
      return 'عرض';
    default:
      return 'إشعار';
  }
}
