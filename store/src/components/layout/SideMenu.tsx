'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, User as UserIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useShellUi } from './ShellUiContext';
import { useAuthStore } from '@/stores/auth-store';
import { usePendingAuthStore } from '@/stores/pending-auth-store';
import { storeApi } from '@/lib/store-api';
import { NOTIFICATIONS_API_ENABLED } from '@/lib/notifications-config';
import { NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from '@/lib/notifications';
import {
  countOrdersNeedingAttention,
  FREE_DELIVERY_MENU_LINK,
  isSideMenuItemActive,
  SIDE_MENU_VERSION,
  sideMenuSections,
  type SideMenuItem,
} from '@/lib/side-menu';
import { Button } from '@/components/ui/Button';

function SideMenuBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function SideMenuNavItem({
  item,
  badge,
  onNavigate,
}: {
  item: SideMenuItem;
  badge?: number;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setChatbotOpen } = useShellUi();
  const requestAuth = usePendingAuthStore((s) => s.requestAuth);
  const active = isSideMenuItemActive(pathname, item, searchParams.toString());
  const Icon = item.icon;

  const className = cn(
    'flex items-center gap-3 min-h-[50px] px-3 py-2 rounded-xl text-sm transition-colors touch-manipulation',
    active
      ? 'bg-primary-50 text-primary-700 font-semibold'
      : 'text-gray-900 hover:bg-gray-50 active:bg-gray-100',
  );

  const content = (
    <>
      <span
        className={cn(
          'w-6 h-6 flex items-center justify-center shrink-0 text-[1.05rem] leading-none',
          active ? 'text-primary-600' : 'text-gray-600',
        )}
        aria-hidden
      >
        {item.emoji ?? <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.25 : 2} />}
      </span>
      <span className="flex-1 min-w-0 text-right leading-snug">{item.label}</span>
      {badge != null && badge > 0 && <SideMenuBadge count={badge} />}
    </>
  );

  if (item.action === 'chatbot') {
    return (
      <button type="button" className={cn(className, 'w-full')} onClick={() => { setChatbotOpen(true); onNavigate(); }}>
        {content}
      </button>
    );
  }

  if (item.action === 'login') {
    return (
      <button
        type="button"
        className={cn(className, 'w-full')}
        onClick={() => {
          requestAuth({ type: 'PAGE_ACCESS', path: '/profile', savedAt: Date.now() });
          onNavigate();
        }}
      >
        {content}
      </button>
    );
  }

  if (!item.href) return null;

  return (
    <Link href={item.href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

function AccountCard({ onNavigate }: { onNavigate: () => void }) {
  const { isAuthenticated, user } = useAuthStore();
  const requestAuth = usePendingAuthStore((s) => s.requestAuth);
  const displayName = user?.name?.trim() || 'ضيف';

  if (isAuthenticated) {
    return (
      <Link
        href="/profile"
        onClick={onNavigate}
        className="block rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5" aria-hidden />
          </span>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-base font-bold text-gray-900 leading-tight">أهلاً، {displayName}</p>
            <p className="mt-1 text-sm text-primary-600 font-medium inline-flex items-center gap-1">
              عرض الملف الشخصي
              <ChevronLeft className="w-4 h-4" aria-hidden />
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 text-lg">
          👤
        </span>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-base font-bold text-gray-900">أهلاً فيك 👋</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            سجل دخولك وخلي تسوقك أسهل.
          </p>
        </div>
      </div>
      <Button
        className="w-full min-h-[44px]"
        onClick={() => {
          requestAuth({ type: 'PAGE_ACCESS', path: '/profile', savedAt: Date.now() });
          onNavigate();
        }}
      >
        تسجيل الدخول
      </Button>
    </div>
  );
}

function FreeDeliveryCard({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Link
      href={FREE_DELIVERY_MENU_LINK.href}
      onClick={onNavigate}
      className={cn(
        'block rounded-2xl border border-primary-100 px-4 py-3.5',
        'bg-gradient-to-l from-primary-50 to-white',
        'hover:from-primary-100/70 hover:to-primary-50/30 transition-colors',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl shrink-0" aria-hidden>
          🚚
        </span>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-bold text-primary-800 leading-snug">
            {FREE_DELIVERY_MENU_LINK.title}
          </p>
          <p className="text-xs text-primary-700/80 mt-0.5 leading-relaxed">
            {FREE_DELIVERY_MENU_LINK.subtitle}
          </p>
        </div>
        <ChevronLeft className="w-5 h-5 text-primary-600 shrink-0" aria-hidden />
      </div>
    </Link>
  );
}

export function SideMenu() {
  const { sideMenuOpen, setSideMenuOpen } = useShellUi();
  const { isAuthenticated } = useAuthStore();

  const { data: ordersPage } = useQuery({
    queryKey: ['orders'],
    queryFn: () => storeApi.getOrders({ limit: 100 }),
    enabled: isAuthenticated && sideMenuOpen,
    staleTime: 60_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: storeApi.getNotificationUnreadCount,
    enabled: NOTIFICATIONS_API_ENABLED && isAuthenticated && sideMenuOpen,
    staleTime: 60_000,
    retry: false,
  });

  const orderBadge = countOrdersNeedingAttention(ordersPage?.items);
  const notificationBadge = unreadData?.count ?? 0;

  if (!sideMenuOpen) return null;

  const close = () => setSideMenuOpen(false);

  const resolveBadge = (item: SideMenuItem) => {
    if (item.badgeKey === 'orders') return orderBadge;
    if (item.badgeKey === 'notifications') return notificationBadge;
    return 0;
  };

  const shoppingSections = sideMenuSections.filter((s) => s.id === 'shopping' || s.id === 'orders');
  const trailingSections = sideMenuSections.filter((s) => s.id === 'help' || s.id === 'account');

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={close}
        aria-label="إغلاق القائمة"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الجانبية"
        className={cn(
          'absolute top-0 bottom-0 right-0 w-[min(85vw,340px)] bg-white shadow-2xl',
          'flex flex-col safe-area-top safe-area-bottom',
          'animate-in slide-in-from-right duration-200',
        )}
      >
        <div className="shrink-0 px-4 pt-5 pb-4 border-b border-gray-100 bg-white">
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-gray-900 tracking-tight">نحلة مول</p>
            <p className="text-sm text-gray-500 mt-1">تسوق بسرعة وثقة</p>
          </div>
          <AccountCard onNavigate={close} />
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
          {shoppingSections.map((section) => (
            <div key={section.id}>
              {section.title && (
                <p className="text-xs font-bold text-gray-400 mb-2 px-1">{section.title}</p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SideMenuNavItem
                    key={item.id}
                    item={item}
                    badge={resolveBadge(item)}
                    onNavigate={close}
                  />
                ))}
              </div>
            </div>
          ))}

          <FreeDeliveryCard onNavigate={close} />

          {trailingSections.map((section) => (
            <div key={section.id}>
              {section.title && (
                <p className="text-xs font-bold text-gray-400 mb-2 px-1">{section.title}</p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SideMenuNavItem
                    key={item.id}
                    item={item}
                    badge={resolveBadge(item)}
                    onNavigate={close}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 px-4 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 tabular-nums">إصدار متجر نحلة مول {SIDE_MENU_VERSION}</p>
        </div>
      </aside>
    </div>
  );
}
