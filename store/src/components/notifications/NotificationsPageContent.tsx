'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ErrorState } from '@/components/ui/EmptyState';
import { storeApi } from '@/lib/store-api';
import { NOTIFICATIONS_API_ENABLED } from '@/lib/notifications-config';
import {
  countUnread,
  getNotificationHref,
  groupNotificationsByDay,
} from '@/lib/notifications';
import type { CustomerNotification } from '@/lib/types';
import { NotificationGroup, NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationsPageSkeleton } from '@/components/notifications/NotificationsPageSkeleton';
import { cn, getErrorMessage } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';

export function NotificationsPageContent() {
  return (
    <AuthGuard>
      <NotificationsInbox />
    </AuthGuard>
  );
}

function NotificationsInbox() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: storeApi.getNotifications,
    enabled: NOTIFICATIONS_API_ENABLED,
    retry: false,
  });

  const notifications = data ?? [];
  const unreadCount = countUnread(notifications);
  const { today, earlier } = groupNotificationsByDay(notifications);

  const markRead = useMutation({
    mutationFn: (id: string) => storeApi.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => storeApi.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast('تم تحديد جميع الإشعارات كمقروءة', 'success');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const handleOpen = async (notification: CustomerNotification) => {
    const href = getNotificationHref(notification);

    if (NOTIFICATIONS_API_ENABLED && !notification.isRead) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        toast('تعذر تحديث حالة الإشعار', 'error');
      }
    }

    if (href) {
      router.push(href);
      return;
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  const showMarkAll =
    NOTIFICATIONS_API_ENABLED && unreadCount > 0 && !markAllRead.isPending;

  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-lg">
      <header className="flex items-center justify-between gap-2 mb-6 min-h-[44px]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              'shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl',
              'text-navy-700 hover:bg-navy-50 transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70',
            )}
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5" aria-hidden />
          </button>
          <h1 className="text-xl font-bold text-navy-900 truncate">
            الإشعارات
          </h1>
        </div>

        {NOTIFICATIONS_API_ENABLED && (
          <button
            type="button"
            disabled={!showMarkAll}
            onClick={() => markAllRead.mutate()}
            className={cn(
              'shrink-0 text-xs font-semibold min-h-[44px] px-2 rounded-lg transition-colors',
              showMarkAll
                ? 'text-primary-700 hover:bg-primary-50/80'
                : 'text-gray-400 cursor-not-allowed',
            )}
          >
            تحديد الكل كمقروء
          </button>
        )}
      </header>

      {!NOTIFICATIONS_API_ENABLED ? (
        <BackendUnavailableEmpty />
      ) : isLoading ? (
        <NotificationsPageSkeleton />
      ) : isError ? (
        <ErrorState message="ما قدرنا نحمّل الإشعارات" onRetry={() => refetch()} />
      ) : notifications.length === 0 ? (
        <InboxEmpty />
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <NotificationGroup title="اليوم">
              {today.map((n) => (
                <NotificationItem key={n.id} notification={n} onOpen={handleOpen} />
              ))}
            </NotificationGroup>
          )}
          {earlier.length > 0 && (
            <NotificationGroup title="سابقًا">
              {earlier.map((n) => (
                <NotificationItem key={n.id} notification={n} onOpen={handleOpen} />
              ))}
            </NotificationGroup>
          )}
        </div>
      )}
    </div>
  );
}

function InboxEmpty() {
  return (
    <div className="empty-state py-16">
      <p className="text-4xl mb-3" aria-hidden>
        🔔
      </p>
      <p className="text-lg font-bold text-gray-900 mb-1">ما عندك إشعارات جديدة</p>
      <p className="text-sm text-gray-500 max-w-xs">
        أول ما يصير شيء مهم، رح تعرف هون.
      </p>
    </div>
  );
}

function BackendUnavailableEmpty() {
  return (
    <div className="empty-state py-12 space-y-4">
      <p className="text-4xl mb-1" aria-hidden>
        🔔
      </p>
      <p className="text-lg font-bold text-gray-900">ما عندك إشعارات جديدة</p>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
        أول ما يصير شيء مهم، رح تعرف هون.
      </p>
      <p className="text-xs text-gray-400 max-w-sm leading-relaxed pt-2">
        نظام الإشعارات من الخادم قيد التجهيز — لا نعرض إشعارات وهمية.
        لتفضيلات الإشعارات المستقبلية، راجع{' '}
        <Link href="/settings/notifications" className="text-primary-700 font-medium hover:underline">
          إعدادات الإشعارات
        </Link>
        .
      </p>
    </div>
  );
}
