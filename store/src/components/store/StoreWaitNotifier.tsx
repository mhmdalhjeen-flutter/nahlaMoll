'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useStoreOpen } from '@/components/store/StoreStatus';
import { storeApi } from '@/lib/store-api';
import { useToastStore } from '@/stores/toast-store';

/** Notifies the customer when a saved wait request becomes actionable after store opens. */
export function StoreWaitNotifier() {
  const { isAuthenticated } = useAuthStore();
  const { isOpen } = useStoreOpen();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const notifiedRef = useRef<string | null>(null);

  const { data: waitRequest } = useQuery({
    queryKey: ['store-wait'],
    queryFn: storeApi.getStoreWaitRequest,
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'WAITING' || status === 'NOTIFIED') return 30_000;
      return false;
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !isOpen || !waitRequest) return;
    if (waitRequest.status !== 'NOTIFIED') return;
    if (notifiedRef.current === waitRequest.id) return;

    notifiedRef.current = waitRequest.id;
    toast('المتجر مفتوح الآن! يمكنك متابعة طلبك.', 'success');
    void storeApi.completeStoreWaitRequest().then(() => {
      qc.invalidateQueries({ queryKey: ['store-wait'] });
    });
  }, [isAuthenticated, isOpen, waitRequest, toast, qc]);

  return null;
}
