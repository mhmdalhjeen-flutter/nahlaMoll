'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLockup } from './BrandLockup';
import { DesktopHeaderSearch } from './DesktopHeaderSearch';
import { MobileHeaderSearchButton } from './MobileHeaderSearchButton';
import { NotificationBellButton } from '@/components/notifications/NotificationBellButton';
import { useShellUi } from './ShellUiContext';
import { useAuthStore } from '@/stores/auth-store';
import { useCartMap } from '@/hooks/useCartMap';
import { desktopSecondaryNav, isHeaderRouteActive } from '@/lib/header-nav';

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute top-1 left-1 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-primary-500 text-navy-900 text-[10px] font-bold tabular-nums leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { setSideMenuOpen } = useShellUi();
  const { isAuthenticated } = useAuthStore();
  const { summary } = useCartMap();
  const cartCount = isAuthenticated ? (summary?.totalItems ?? 0) : 0;

  return (
    <header className="sticky top-0 z-40 safe-area-top">
      {/* ── Mobile: navy primary bar + search row ── */}
      <div className="md:hidden surface-header-primary">
        <div className="container mx-auto px-2 max-w-6xl">
          <div className="h-12 flex items-center gap-1">
            <button
              type="button"
              className="header-action-dark w-10 h-10 shrink-0"
              onClick={() => setSideMenuOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" aria-hidden />
            </button>

            <div className="flex-1 flex justify-center min-w-0 px-0.5">
              <BrandLockup size="sm" onDark />
            </div>

            <NotificationBellButton variant="dark" />

            <Link
              href="/cart"
              className={cn(
                'header-action-dark w-10 h-10 shrink-0',
                isHeaderRouteActive(pathname, '/cart') && 'header-action-dark-active',
              )}
              aria-label={cartCount > 0 ? `السلة — ${cartCount} منتج` : 'السلة'}
            >
              <ShoppingCart className="w-5 h-5" aria-hidden />
              <CartBadge count={cartCount} />
            </Link>
          </div>

          <div className="pb-2.5 pt-0.5">
            <MobileHeaderSearchButton />
          </div>
        </div>
        <div className="header-gold-accent" aria-hidden />
      </div>

      {/* ── Desktop: two-row marketplace header ── */}
      <div className="hidden md:block">
        <div className="surface-header-primary">
          <div className="container mx-auto px-4 lg:px-6 max-w-6xl">
            <div className="h-16 flex items-center gap-4 lg:gap-6">
              <BrandLockup size="md" onDark />

              <div className="flex-1 min-w-0 max-w-2xl mx-auto">
                <DesktopHeaderSearch size="large" />
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <NotificationBellButton variant="dark" />

                <Link
                  href="/cart"
                  className={cn(
                    'header-action-dark',
                    isHeaderRouteActive(pathname, '/cart') && 'header-action-dark-active',
                  )}
                  aria-label={cartCount > 0 ? `السلة — ${cartCount} منتج` : 'السلة'}
                >
                  <ShoppingCart className="w-5 h-5" aria-hidden />
                  <CartBadge count={cartCount} />
                </Link>

                <Link
                  href="/profile"
                  className={cn(
                    'header-action-dark',
                    isHeaderRouteActive(pathname, '/profile') && 'header-action-dark-active',
                  )}
                  aria-label="الحساب"
                >
                  <User className="w-5 h-5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
          <div className="header-gold-accent" aria-hidden />
        </div>

        <nav
          className="surface-header-secondary"
          aria-label="التسوق والأقسام"
        >
          <div className="container mx-auto px-4 lg:px-6 max-w-6xl">
            <div className="flex items-center gap-1 h-11 overflow-x-auto scrollbar-hide">
              {desktopSecondaryNav.map(({ href, label, icon: Icon, match }) => {
                const active = match(pathname, search);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'header-secondary-link shrink-0',
                      active && 'header-secondary-link-active',
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden />}
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
