'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LoadMoreSentinelProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
  /** Scroll container for nested scroll areas; omit for viewport scrolling. */
  scrollRoot?: Element | null;
  className?: string;
}

/** Triggers incremental loading when the sentinel enters the scroll viewport. */
export function LoadMoreSentinel({
  onLoadMore,
  hasMore,
  isLoading,
  scrollRoot,
  className,
}: LoadMoreSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: scrollRoot ?? null,
        rootMargin: '160px 0px',
        threshold: 0,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, scrollRoot]);

  if (!hasMore && !isLoading) return null;

  return (
    <div
      ref={sentinelRef}
      className={cn('flex justify-center items-center py-3 min-h-[44px]', className)}
      aria-live="polite"
      aria-busy={isLoading}
    >
      {isLoading && (
        <span className="text-xs font-medium text-gray-500">جاري التحميل...</span>
      )}
    </div>
  );
}
