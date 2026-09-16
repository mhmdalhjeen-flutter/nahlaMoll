'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShellUi } from './ShellUiContext';

const PLACEHOLDER = 'شو حابب تشتري اليوم؟';

interface MobileHeaderSearchButtonProps {
  className?: string;
}

/** Compact mobile search affordance — opens existing search overlay. */
export function MobileHeaderSearchButton({ className }: MobileHeaderSearchButtonProps) {
  const { setSearchOpen } = useShellUi();

  return (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      className={cn('header-search-trigger w-full', className)}
      aria-label={PLACEHOLDER}
    >
      <Search className="w-4 h-4 shrink-0 text-navy-400" aria-hidden />
      <span className="flex-1 truncate text-right">{PLACEHOLDER}</span>
    </button>
  );
}
