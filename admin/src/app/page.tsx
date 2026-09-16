'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/stores/auth-store';

export default function HomePage() {
  const { isAuthenticated, isInitialized } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, isInitialized, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="skeleton h-8 w-48" />
    </div>
  );
}
