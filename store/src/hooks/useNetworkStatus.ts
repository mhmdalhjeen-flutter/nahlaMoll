'use client';

import { useCallback, useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const retry = useCallback(() => {
    window.location.reload();
  }, []);

  return { online, retry };
}
