'use client';

import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import type { FreeDeliverySummary } from '@/lib/types';
import { FREE_DELIVERY_PROGRESS_TARGET } from '@/lib/delivery.constants';

export function useFreeDeliveryProgress(cartSummary?: FreeDeliverySummary) {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: storeApi.getPublicSettings,
  });

  const target = cartSummary?.target ?? settings?.freeDeliveryTarget ?? FREE_DELIVERY_PROGRESS_TARGET;
  const numericTarget = Number(target) || FREE_DELIVERY_PROGRESS_TARGET;
  const displayed = cartSummary?.displayedScore ?? 0;
  const remaining = cartSummary?.remainingScore ?? Math.max(0, numericTarget - displayed);
  const pct = Math.min(
    100,
    cartSummary?.progressPercentage ?? 0,
  );
  const achieved = cartSummary?.isFreeDelivery ?? false;

  return { target: numericTarget, displayed, remaining, pct, achieved };
}
