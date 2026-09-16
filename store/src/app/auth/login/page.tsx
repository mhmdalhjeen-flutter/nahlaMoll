'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePendingAuthStore } from '@/stores/pending-auth-store';

function sanitizeReturnPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

/** Legacy login route — opens in-place auth sheet on the target page. */
function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestAuth = usePendingAuthStore((s) => s.requestAuth);

  useEffect(() => {
    const returnTo = sanitizeReturnPath(searchParams.get('returnTo') || '/');
    requestAuth({ type: 'PAGE_ACCESS', path: returnTo, savedAt: Date.now() });
    router.replace(returnTo);
  }, [router, searchParams, requestAuth]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirect />
    </Suspense>
  );
}
