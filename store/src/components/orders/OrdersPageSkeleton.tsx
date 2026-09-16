'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function OrdersPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-3xl space-y-5">
      <Skeleton className="h-9 w-28" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-xl" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
          <div className="flex justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
