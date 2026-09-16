'use client';

import type { LucideIcon } from 'lucide-react';
import { Heart, Package, Truck, Sparkles, Tag, Bell } from 'lucide-react';
import type { CustomerNotification, CustomerNotificationType } from '@/lib/types';
import {
  formatRelativeTimeAr,
  getNotificationHref,
  getNotificationVisualTone,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<CustomerNotificationType, LucideIcon> = {
  order: Package,
  delivery: Truck,
  free_delivery: Sparkles,
  favorite: Heart,
  offer: Tag,
  system: Bell,
};

interface NotificationItemProps {
  notification: CustomerNotification;
  onOpen: (notification: CustomerNotification) => void;
}

export function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const tone = getNotificationVisualTone(notification.type);
  const href = getNotificationHref(notification);
  const unread = !notification.isRead;

  const content = (
    <>
      <span
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          tone === 'success' && 'bg-success-50 text-success-700',
          tone === 'warning' && 'bg-warning-50 text-warning-800',
          tone === 'default' && 'bg-navy-50 text-navy-700',
        )}
      >
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <span className="flex-1 min-w-0 text-right">
        <span className="block text-sm font-semibold text-gray-900 leading-snug">
          {notification.title}
        </span>
        <span className="block text-sm text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
          {notification.message}
        </span>
        <span className="block text-xs text-gray-400 mt-1.5 tabular-nums">
          {formatRelativeTimeAr(notification.createdAt)}
        </span>
      </span>
      {unread && (
        <span
          className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-2"
          aria-hidden
        />
      )}
    </>
  );

  const className = cn(
    'w-full flex items-start gap-3 p-4 rounded-2xl border text-right transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
    unread
      ? 'bg-primary-50/40 border-primary-200/70 hover:bg-primary-50/70 shadow-sm'
      : 'bg-white border-gray-100 hover:bg-gray-50/80',
  );

  if (href) {
    return (
      <button type="button" className={className} onClick={() => onOpen(notification)}>
        {content}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpen(notification)}
      aria-label={notification.title}
    >
      {content}
    </button>
  );
}

interface NotificationGroupProps {
  title: string;
  children: React.ReactNode;
}

export function NotificationGroup({ title, children }: NotificationGroupProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold text-gray-500 px-1">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
