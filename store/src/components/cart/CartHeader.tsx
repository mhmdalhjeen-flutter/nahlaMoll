'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartHeaderProps {
  subtitle?: string;
  onClearAll?: () => void;
  clearAllDisabled?: boolean;
  className?: string;
}

export function CartHeader({
  subtitle,
  onClearAll,
  clearAllDisabled,
  className,
}: CartHeaderProps) {
  return (
    <header className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div className="flex items-start gap-2 min-w-0">
        <Link
          href="/"
          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="رجوع"
        >
          <ChevronRight className="w-5 h-5" aria-hidden />
        </Link>
        <div className="min-w-0 pt-2">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">السلة</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5 tabular-nums">{subtitle}</p>
          )}
        </div>
      </div>

      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          disabled={clearAllDisabled}
          className="shrink-0 min-h-[44px] px-2 text-xs font-medium text-gray-500 hover:text-error-600 disabled:opacity-40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
        >
          حذف الكل
        </button>
      )}
    </header>
  );
}
