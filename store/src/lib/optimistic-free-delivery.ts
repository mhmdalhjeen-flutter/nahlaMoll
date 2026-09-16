import type { QueryClient } from '@tanstack/react-query';
import type { CartItem, FreeDeliverySummary, PublicSettings } from './types';
import {
  FREE_DELIVERY_ELIGIBILITY_THRESHOLD,
  FREE_DELIVERY_PROGRESS_TARGET,
} from './delivery.constants';
import { getCartLinePricing } from './cart-item-utils';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Mirrors backend CartService.calculateCartTotals — sum(unitPrice × quantity). */
export function computeCartSubtotalFromItems(items: CartItem[]): number {
  return round2(
    items.reduce((sum, item) => sum + getCartLinePricing(item).lineTotal, 0),
  );
}

/** Mirrors backend: sum(product.freeDeliveryValue × quantity) as percentage points */
export function computeFreeDeliveryScoreFromItems(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const contribution = Number(item.product?.freeDeliveryValue ?? 0);
    if (!Number.isFinite(contribution) || contribution <= 0) return sum;
    return sum + contribution * item.quantity;
  }, 0);
}

/**
 * Mirrors backend DeliveryService.calculateScoreResult (percentage model).
 */
export function recalculateFreeDeliverySummary(
  items: CartItem[],
  baseSummary: FreeDeliverySummary,
): FreeDeliverySummary {
  const rawProgress = computeFreeDeliveryScoreFromItems(items);
  const target = FREE_DELIVERY_PROGRESS_TARGET;
  const originalFee = baseSummary.originalDeliveryFee;
  const areaEligible = baseSummary.areaEligibility;

  let deliveryFee = originalFee;
  let deliveryDiscount = 0;
  let isFreeDelivery = false;

  if (areaEligible && rawProgress >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD) {
    isFreeDelivery = true;
    deliveryDiscount = originalFee;
    deliveryFee = 0;
  }

  const displayedScore = Math.min(rawProgress, target);
  const remainingScore = Math.max(0, target - rawProgress);
  const progressPercentage = Math.min(100, round2(rawProgress));

  return {
    ...baseSummary,
    actualScore: round2(rawProgress),
    displayedScore: round2(displayedScore),
    target,
    progressPercentage,
    remainingScore: round2(remainingScore),
    deliveryFee: round2(deliveryFee),
    deliveryDiscount: round2(deliveryDiscount),
    isFreeDelivery,
    isPartialFreeDelivery: false,
    partialEnabled: false,
    partialThreshold: 0,
    partialDiscount: 0,
    subtotal: computeCartSubtotalFromItems(items),
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    itemCount: items.length,
  };
}

export function buildDefaultFreeDeliverySummary(
  qc: QueryClient,
  items: CartItem[],
): FreeDeliverySummary {
  const settings = qc.getQueryData<PublicSettings>(['public-settings']);

  const base: FreeDeliverySummary = {
    actualScore: 0,
    displayedScore: 0,
    target: FREE_DELIVERY_PROGRESS_TARGET,
    progressPercentage: 0,
    partialEnabled: false,
    partialThreshold: 0,
    partialDiscount: 0,
    originalDeliveryFee: 0,
    deliveryFee: 0,
    deliveryDiscount: 0,
    isFreeDelivery: false,
    isPartialFreeDelivery: false,
    areaEligibility: null,
    remainingScore: FREE_DELIVERY_PROGRESS_TARGET,
    subtotal: 0,
    totalItems: 0,
    itemCount: 0,
  };

  void settings;
  return recalculateFreeDeliverySummary(items, base);
}

export function recalcCartSummaryFromItems(
  qc: QueryClient,
  items: CartItem[],
  previousSummary?: FreeDeliverySummary,
): FreeDeliverySummary {
  const base = previousSummary ?? buildDefaultFreeDeliverySummary(qc, items);
  return recalculateFreeDeliverySummary(items, base);
}
