'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function CartPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <Skeleton className="h-[88px] w-full rounded-xl" />

      <div className="space-y-3">
        <Skeleton className="h-[140px] w-full rounded-xl" />
        <Skeleton className="h-[140px] w-full rounded-xl" />
      </div>

      <Skeleton className="h-[132px] w-full rounded-xl" />
    </div>
  );
}
