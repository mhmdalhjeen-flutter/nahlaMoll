import type { FreeDeliverySummary } from './types';
import { getFreeDeliveryContribution } from './free-delivery';

/** True when adding this product (× qty) could reach the free-delivery threshold. */
export function canProductCompleteFreeDelivery(input: {
  freeDeliveryValue: string | number | null | undefined;
  quantity: number;
  cartSummary?: Pick<
    FreeDeliverySummary,
    'remainingScore' | 'progressPercentage' | 'isFreeDelivery' | 'areaEligibility'
  > | null;
}): boolean {
  const contribution = getFreeDeliveryContribution(input.freeDeliveryValue);
  if (contribution == null || contribution <= 0) return false;

  const summary = input.cartSummary;
  if (!summary) return false;
  if (summary.isFreeDelivery) return false;
  if (summary.areaEligibility === false) return false;

  const progress = summary.progressPercentage ?? 0;
  if (progress >= 95) return false;

  const remaining = summary.remainingScore ?? 0;
  if (remaining <= 0) return false;

  const added = contribution * Math.max(1, input.quantity);
  return added >= remaining;
}
