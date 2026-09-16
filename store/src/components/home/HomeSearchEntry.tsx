'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShellUi } from '@/components/layout/ShellUiContext';

const HOME_SEARCH_PLACEHOLDER = 'شو حابب تشتري اليوم؟';

interface HomeSearchEntryProps {
  className?: string;
}

/** Mobile homepage search affordance — opens existing search panel. */
export function HomeSearchEntry({ className }: HomeSearchEntryProps) {
  const { setSearchOpen } = useShellUi();

  return (
    <div className={cn('container mx-auto px-4 max-w-6xl md:hidden pt-2 pb-0', className)}>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className={cn(
          'w-full min-h-[48px] flex items-center gap-3 px-4',
          'bg-white border border-gray-200 rounded-xl shadow-card',
          'text-gray-500 text-sm text-right',
          'hover:border-gray-300 hover:shadow-card-hover active:scale-[0.99] transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-navy-100 focus:border-navy-400',
        )}
        aria-label={HOME_SEARCH_PLACEHOLDER}
      >
        <Search className="w-5 h-5 shrink-0 text-gray-400" aria-hidden />
        <span className="flex-1">{HOME_SEARCH_PLACEHOLDER}</span>
      </button>
    </div>
  );
}
