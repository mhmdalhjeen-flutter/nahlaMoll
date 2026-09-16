'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  ClipboardList,
  User,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartMap } from '@/hooks/useCartMap';
import { useAuthStore } from '@/stores/auth-store';

/** Minimum content height of the mobile bottom bar (excluding safe-area padding). */
export const MOBILE_BOTTOM_NAV_HEIGHT = '4.5rem';

/** Full mobile bottom chrome height including safe-area inset. */
export const MOBILE_BOTTOM_OFFSET = 'calc(4.5rem + env(safe-area-inset-bottom, 0px))';

export type MobileBottomNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  isCart?: boolean;
};

/** RTL visual order (right → left): الرئيسية … حسابي */
export const mobileBottomNavItems: MobileBottomNavItem[] = [
  { href: '/', label: 'الرئيسية', icon: Home, match: (path) => path === '/' },
  {
    href: '/categories',
    label: 'الأقسام',
    icon: LayoutGrid,
    match: (path) => path.startsWith('/categories'),
  },
  {
    href: '/cart',
    label: 'السلة',
    icon: ShoppingCart,
    isCart: true,
    match: (path) => path.startsWith('/cart') || path.startsWith('/checkout'),
  },
  {
    href: '/orders',
    label: 'طلباتي',
    icon: ClipboardList,
    match: (path) => path.startsWith('/orders'),
  },
  {
    href: '/profile',
    label: 'حسابي',
    icon: User,
    match: (path) => path.startsWith('/profile') || path.startsWith('/auth'),
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { summary } = useCartMap();
  const cartCount = isAuthenticated ? (summary?.totalItems ?? 0) : 0;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 surface-bottom-nav safe-area-bottom"
      aria-label="التنقل الرئيسي"
      data-testid="mobile-bottom-nav"
    >
      <div
        className="flex items-stretch justify-between max-w-lg mx-auto px-1"
        style={{ minHeight: MOBILE_BOTTOM_NAV_HEIGHT }}
      >
        {mobileBottomNavItems.map(({ href, label, icon: Icon, match, isCart }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              data-testid={`mobile-nav-${href === '/' ? 'home' : href.slice(1)}`}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 min-w-0 py-2',
                'transition-colors active:scale-[0.98] touch-manipulation min-h-[44px]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'relative flex items-center justify-center min-w-[2.75rem] h-9 px-2.5 rounded-full transition-colors duration-200',
                  active ? 'bg-primary-50' : 'bg-transparent',
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5',
                    active ? 'stroke-[2.5px] text-primary-700' : 'text-gray-500',
                  )}
                  aria-hidden
                />
                {isCart && cartCount > 0 && (
                  <span
                    className="absolute -top-1 -left-1 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-navy-600 text-white text-[10px] font-bold tabular-nums leading-none"
                    data-testid="mobile-nav-cart-badge"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>

              <span
                className={cn(
                  'text-xs leading-tight truncate max-w-full',
                  active ? 'font-semibold text-primary-700' : 'font-medium text-gray-500',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
