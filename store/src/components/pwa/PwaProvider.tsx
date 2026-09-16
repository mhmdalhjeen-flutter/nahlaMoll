'use client';

import { useEffect } from 'react';

const isProd = process.env.NODE_ENV === 'production';

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isProd || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: the storefront remains usable without a service worker.
    });
  }, []);

  return children;
}
