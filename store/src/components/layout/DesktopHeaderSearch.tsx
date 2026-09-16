'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShellUi } from './ShellUiContext';

interface DesktopHeaderSearchProps {
  className?: string;
  size?: 'default' | 'large';
}

/** Inline desktop search — syncs with search overlay and /search page. */
export function DesktopHeaderSearch({
  className,
  size = 'default',
}: DesktopHeaderSearchProps) {
  const router = useRouter();
  const { searchQuery, setSearchQuery, setSearchOpen } = useShellUi();

  const handleFocus = () => {
    setSearchOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim();
      if (q.length >= 2) {
        setSearchOpen(false);
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className="absolute right-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-navy-400 pointer-events-none"
        aria-hidden
      />
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          if (e.target.value.trim().length >= 2) {
            setSearchOpen(true);
          }
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="شو حابب تشتري اليوم؟"
        aria-label="شو حابب تشتري اليوم؟"
        className={cn(
          'header-search-field',
          size === 'large' ? 'min-h-[46px] text-[15px]' : 'min-h-[44px] text-sm',
        )}
      />
    </div>
  );
}
