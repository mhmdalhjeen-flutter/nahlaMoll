'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, ShoppingCart } from 'lucide-react';
import { useShellUi } from '@/components/layout/ShellUiContext';
import { useAuthStore } from '@/stores/auth-store';
import { useCartMap } from '@/hooks/useCartMap';

const HOME_SEARCH_PLACEHOLDER = 'شو حابب تشتري اليوم؟';

export function AllCategoriesHeader() {
  const router = useRouter();
  const { setSearchOpen } = useShellUi();
  const { isAuthenticated } = useAuthStore();
  const { summary } = useCartMap();
  const cartCount = isAuthenticated ? (summary?.totalItems ?? 0) : 0;

  return (
    <header className="z-40 surface-header-primary safe-area-top shrink-0">
      <div className="flex items-center gap-2 px-2 h-14 max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/categories')}
          className="header-action-dark shrink-0 min-w-11 min-h-11"
          aria-label="رجوع للأقسام"
        >
          <ArrowRight className="w-5 h-5" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="header-search-trigger flex-1 min-w-0"
          aria-label={HOME_SEARCH_PLACEHOLDER}
        >
          <Search className="w-4 h-4 shrink-0 text-navy-400" aria-hidden />
          <span className="flex-1 truncate text-right">{HOME_SEARCH_PLACEHOLDER}</span>
        </button>

        <Link
          href="/cart"
          className="header-action-dark relative shrink-0 min-w-11 min-h-11"
          aria-label={cartCount > 0 ? `السلة — ${cartCount} منتج` : 'السلة'}
        >
          <ShoppingCart className="w-5 h-5" aria-hidden />
          {cartCount > 0 && (
            <span className="absolute top-1 left-1 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-primary-500 text-navy-900 text-[10px] font-bold tabular-nums">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </div>
      <div className="header-gold-accent" aria-hidden />
    </header>
  );
}
