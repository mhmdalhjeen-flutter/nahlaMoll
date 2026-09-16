'use client';

import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Button } from '@/components/ui/Button';

export function NetworkStatusBanner() {
  const { online, retry } = useNetworkStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 safe-area-top"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>لا يوجد اتصال بالإنترنت حاليًا. بعض المحتوى قد لا يكون متاحًا.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={retry} className="shrink-0">
          إعادة المحاولة
        </Button>
      </div>
    </div>
  );
}
