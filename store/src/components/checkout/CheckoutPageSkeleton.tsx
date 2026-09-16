'use client';

import { Skeleton } from '@/components/ui/Skeleton';

export function CheckoutPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 max-w-lg lg:max-w-5xl space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}
