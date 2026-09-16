'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'jako-free-delivery-explained';

export function useFreeDeliveryExplained() {
  const [hasExplained, setHasExplained] = useState(true);

  useEffect(() => {
    try {
      setHasExplained(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setHasExplained(false);
    }
  }, []);

  const markExplained = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setHasExplained(true);
  }, []);

  return { hasExplained, markExplained };
}
