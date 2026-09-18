'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { storeApi } from '@/lib/store-api';
import { NOTIFICATIONS_API_ENABLED } from '@/lib/notifications-config';
import { NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from '@/lib/notifications';
import { usePendingAuthStore } from '@/stores/pending-auth-store';

interface NotificationBellButtonProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function NotificationBellButton({
  className,
  variant = 'light',
}: NotificationBellButtonProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const requestAuth = usePendingAuthStore((s) => s.requestAuth);

  const { data: unreadData } = useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: storeApi.getNotificationUnreadCount,
    enabled: NOTIFICATIONS_API_ENABLED && isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });

  const unreadCount = unreadData?.count ?? 0;
  const active =
    pathname === '/notifications' || pathname.startsWith('/notifications/');

  const handleGuestClick = (e: React.MouseEvent) => {
    if (isAuthenticated) return;
    e.preventDefault();
    requestAuth({
      type: 'PAGE_ACCESS',
      path: '/notifications',
      savedAt: Date.now(),
    });
  };

  const baseClass =
    variant === 'dark'
      ? cn('header-action-dark', active && 'header-action-dark-active')
      : cn('header-action', active && 'header-action-active');

  return (
    <Link
      href="/notifications"
      onClick={handleGuestClick}
      className={cn(baseClass, className)}
      aria-label={
        unreadCount > 0
          ? `الإشعارات — ${unreadCount} غير مقروء`
          : 'الإشعارات'
      }
    >
      <Bell className="w-5 h-5" aria-hidden />
      {NOTIFICATIONS_API_ENABLED && unreadCount > 0 && (
        <span className="absolute top-1 left-1 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-primary-500 text-navy-900 text-[10px] font-bold tabular-nums">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
