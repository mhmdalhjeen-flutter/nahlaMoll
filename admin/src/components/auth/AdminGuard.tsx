'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAdminAuth } from '@/stores/auth-store';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isInitialized, router]);

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="skeleton h-8 w-48" />
      </div>
    );
  }

  return <>{children}</>;
}
