'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useCheckoutStore } from '@/stores/checkout-store';

/**
 * Validates persisted deliveryAreaId against active backend areas.
 * Returns null while areas load or when the stored id is stale/deleted.
 */
export function useValidatedDeliveryArea() {
  const storedId = useCheckoutStore((s) => s.deliveryAreaId);
  const setDeliveryAreaId = useCheckoutStore((s) => s.setDeliveryAreaId);

  const areasQuery = useQuery({
    queryKey: ['delivery-areas'],
    queryFn: storeApi.getDeliveryAreas,
    staleTime: 5 * 60 * 1000,
  });

  const areas = useMemo(() => areasQuery.data ?? [], [areasQuery.data]);

  const validatedId = useMemo(() => {
    if (!areasQuery.isSuccess || !storedId) return null;
    return areas.some((a) => a.id === storedId) ? storedId : null;
  }, [areasQuery.isSuccess, areas, storedId]);

  useEffect(() => {
    if (!areasQuery.isSuccess || !storedId) return;
    if (!areas.some((a) => a.id === storedId)) {
      setDeliveryAreaId(null);
    }
  }, [areasQuery.isSuccess, areas, storedId, setDeliveryAreaId]);

  return {
    deliveryAreaId: validatedId,
    areasReady: areasQuery.isSuccess,
    areas,
    setDeliveryAreaId,
    storedId,
  };
}
