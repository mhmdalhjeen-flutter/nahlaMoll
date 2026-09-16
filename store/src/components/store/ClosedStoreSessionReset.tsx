'use client';

import { useEffect } from 'react';
import { useStoreOpen } from '@/components/store/StoreStatus';
import { clearClosedStoreWarningAck } from '@/lib/closed-store-session';

/** Resets the informational closed-store warning when the store opens. */
export function ClosedStoreSessionReset() {
  const { isOpen } = useStoreOpen();

  useEffect(() => {
    if (isOpen) {
      clearClosedStoreWarningAck();
    }
  }, [isOpen]);

  return null;
}
