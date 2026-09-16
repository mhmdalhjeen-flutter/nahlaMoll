'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { usePendingAuthStore } from '@/stores/pending-auth-store';
import { Skeleton } from '@/components/ui/Skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const requestAuth = usePendingAuthStore((s) => s.requestAuth);
  const authSheetOpen = usePendingAuthStore((s) => s.authSheetOpen);

  useEffect(() => {
    if (!isInitialized || isAuthenticated) return;
    const path =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/';
    requestAuth({ type: 'PAGE_ACCESS', path, savedAt: Date.now() });
  }, [isAuthenticated, isInitialized, requestAuth]);

  if (!isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 w-full" />
        <p className="text-sm text-gray-400 text-center mt-4">جاري التحقق من الجلسة...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 w-full" />
        {authSheetOpen && (
          <p className="text-sm text-gray-500 text-center mt-4">أكمل تسجيل الدخول للمتابعة</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
