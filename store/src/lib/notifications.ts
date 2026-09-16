import type {
  CustomerNotification,
  CustomerNotificationTargetType,
  CustomerNotificationType,
} from './types';

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
  const { targetType, targetId } = notification;
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
    default:
      return null;
  }
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
