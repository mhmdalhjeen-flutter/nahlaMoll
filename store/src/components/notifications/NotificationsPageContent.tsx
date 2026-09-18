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
  DEFAULT_NOTIFICATIONS_LIMIT,
  DEFAULT_NOTIFICATIONS_PAGE,
  getNotificationHref,
  groupNotificationsByDay,
  NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
  notificationsListQueryKey,
  patchNotificationListAllRead,
  patchNotificationListRead,
} from '@/lib/notifications';
import type { CustomerNotification, NotificationUnreadCount, PaginatedList } from '@/lib/types';
import { NotificationGroup, NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationsPageSkeleton } from '@/components/notifications/NotificationsPageSkeleton';
import { cn, getErrorMessage } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';
import { useAuthStore } from '@/stores/auth-store';

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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const listQueryKey = notificationsListQueryKey(
    DEFAULT_NOTIFICATIONS_PAGE,
    DEFAULT_NOTIFICATIONS_LIMIT,
  );

  const notificationsEnabled =
    NOTIFICATIONS_API_ENABLED && isAuthenticated;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      storeApi.getNotifications({
        page: DEFAULT_NOTIFICATIONS_PAGE,
        limit: DEFAULT_NOTIFICATIONS_LIMIT,
      }),
    enabled: notificationsEnabled,
    staleTime: 60_000,
    retry: false,
  });

  const { data: unreadData } = useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: storeApi.getNotificationUnreadCount,
    enabled: notificationsEnabled,
    staleTime: 60_000,
    retry: false,
  });

  const notifications = data?.items ?? [];
  const unreadCount = unreadData?.count ?? 0;
  const { today, earlier } = groupNotificationsByDay(notifications);

  const markRead = useMutation({
    mutationFn: (id: string) => storeApi.markNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: listQueryKey });
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });

      const previousList = qc.getQueryData<PaginatedList<CustomerNotification>>(listQueryKey);
      const previousUnread = qc.getQueryData<NotificationUnreadCount>(
        NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
      );

      qc.setQueryData(
        listQueryKey,
        patchNotificationListRead(previousList, id),
      );

      const wasUnread = previousList?.items.some((n) => n.id === id && !n.isRead);
      if (wasUnread && previousUnread && previousUnread.count > 0) {
        qc.setQueryData(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, {
          count: previousUnread.count - 1,
        });
      }

      return { previousList, previousUnread };
    },
    onError: (_err, _id, context) => {
      if (context?.previousList) {
        qc.setQueryData(listQueryKey, context.previousList);
      }
      if (context?.previousUnread) {
        qc.setQueryData(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, context.previousUnread);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => storeApi.markAllNotificationsRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: listQueryKey });
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });

      const previousList = qc.getQueryData<PaginatedList<CustomerNotification>>(listQueryKey);
      const previousUnread = qc.getQueryData<NotificationUnreadCount>(
        NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
      );

      qc.setQueryData(listQueryKey, patchNotificationListAllRead(previousList));
      qc.setQueryData(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, { count: 0 });

      return { previousList, previousUnread };
    },
    onSuccess: () => {
      toast('تم تحديد جميع الإشعارات كمقروءة', 'success');
    },
    onError: (e, _vars, context) => {
      if (context?.previousList) {
        qc.setQueryData(listQueryKey, context.previousList);
      }
      if (context?.previousUnread) {
        qc.setQueryData(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, context.previousUnread);
      }
      toast(getErrorMessage(e), 'error');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });
    },
  });

  const handleOpen = async (notification: CustomerNotification) => {
    const href = getNotificationHref(notification);

    if (notificationsEnabled && !notification.isRead) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        toast('تعذر تحديث حالة الإشعار', 'error');
      }
    }

    if (href) {
      router.push(href);
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
    notificationsEnabled && unreadCount > 0 && !markAllRead.isPending;

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

        {notificationsEnabled && (
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
