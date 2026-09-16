import { describe, expect, it } from 'vitest';
import {
  buildFreeDeliveryFabView,
  getFreeDeliveryFabStageToast,
  shouldNotifyFreeDeliveryStageChange,
  shouldShowFreeDeliveryFab,
} from './free-delivery-fab';
import type { FreeDeliverySummary } from './types';

function summary(overrides: Partial<FreeDeliverySummary>): FreeDeliverySummary {
  return {
    actualScore: 0,
    displayedScore: 0,
    target: 100,
    progressPercentage: 0,
    partialEnabled: false,
    partialThreshold: 0,
    partialDiscount: 0,
    originalDeliveryFee: 0,
    deliveryFee: 0,
    deliveryDiscount: 0,
    isFreeDelivery: false,
    isPartialFreeDelivery: false,
    areaEligibility: true,
    remainingScore: 100,
    subtotal: 0,
    totalItems: 0,
    itemCount: 0,
    ...overrides,
  };
}

describe('free-delivery-fab', () => {
  it('returns null for empty cart', () => {
    expect(buildFreeDeliveryFabView(summary({ totalItems: 0 }))).toBeNull();
    expect(buildFreeDeliveryFabView(undefined)).toBeNull();
  });

  it('builds compact building stage below 80%', () => {
    const view = buildFreeDeliveryFabView(
      summary({ totalItems: 2, progressPercentage: 45, subtotal: 45 }),
    );
    expect(view?.stage).toBe('building');
    expect(view?.displayPct).toBe(45);
    expect(view?.headline).toBeNull();
  });

  it('shows encouragement between 80% and 94%', () => {
    const view = buildFreeDeliveryFabView(
      summary({ totalItems: 1, progressPercentage: 83, subtotal: 50 }),
    );
    expect(view?.stage).toBe('encouragement');
    expect(view?.headline).toContain('اقتربت');
    expect(view?.remainingToEligibility).toBe(12);
    expect(view?.subline).toBe('باقي 12%');
  });

  it('shows eligible state at 95%+ with isFreeDelivery', () => {
    const view = buildFreeDeliveryFabView(
      summary({
        totalItems: 3,
        progressPercentage: 96,
        isFreeDelivery: true,
        subtotal: 120,
      }),
    );
    expect(view?.stage).toBe('eligible');
    expect(view?.headline).toContain('كملنا الباقي');
  });

  it('shows complete state at 100%', () => {
    const view = buildFreeDeliveryFabView(
      summary({
        totalItems: 2,
        progressPercentage: 100,
        isFreeDelivery: true,
        subtotal: 150,
      }),
    );
    expect(view?.stage).toBe('complete');
    expect(view?.displayPct).toBe(100);
    expect(view?.headline).toContain('مبارك');
  });

  it('caps display progress at 100', () => {
    const view = buildFreeDeliveryFabView(
      summary({ totalItems: 1, progressPercentage: 110, subtotal: 10 }),
    );
    expect(view?.displayPct).toBe(100);
  });

  it('hides on checkout route only', () => {
    expect(shouldShowFreeDeliveryFab('/checkout')).toBe(false);
    expect(shouldShowFreeDeliveryFab('/cart')).toBe(true);
    expect(shouldShowFreeDeliveryFab('/')).toBe(true);
  });

  it('keeps subtotal from cart summary at 100%', () => {
    const view = buildFreeDeliveryFabView(
      summary({
        totalItems: 3,
        progressPercentage: 100,
        isFreeDelivery: true,
        subtotal: 85,
      }),
    );
    expect(view?.displayPct).toBe(100);
    expect(view?.subtotal).toBe(85);
  });

  it('notifies only when advancing into milestone stages', () => {
    expect(
      shouldNotifyFreeDeliveryStageChange('building', 'encouragement', false),
    ).toBe(true);
    expect(
      shouldNotifyFreeDeliveryStageChange('encouragement', 'eligible', false),
    ).toBe(true);
    expect(
      shouldNotifyFreeDeliveryStageChange('eligible', 'complete', false),
    ).toBe(true);
    expect(
      shouldNotifyFreeDeliveryStageChange('complete', 'eligible', false),
    ).toBe(false);
    expect(
      shouldNotifyFreeDeliveryStageChange(null, 'complete', true),
    ).toBe(false);
  });

  it('builds stage toast messages for milestones', () => {
    const encouragement = buildFreeDeliveryFabView(
      summary({ totalItems: 1, progressPercentage: 83, subtotal: 50 }),
    )!;
    expect(getFreeDeliveryFabStageToast(encouragement)?.message).toContain('اقتربت');
    expect(getFreeDeliveryFabStageToast(encouragement)?.message).toContain('باقي');

    const eligible = buildFreeDeliveryFabView(
      summary({
        totalItems: 2,
        progressPercentage: 96,
        isFreeDelivery: true,
        subtotal: 70,
      }),
    )!;
    expect(getFreeDeliveryFabStageToast(eligible)?.message).toContain('كملنا الباقي');

    const complete = buildFreeDeliveryFabView(
      summary({
        totalItems: 2,
        progressPercentage: 100,
        isFreeDelivery: true,
        subtotal: 90,
      }),
    )!;
    expect(getFreeDeliveryFabStageToast(complete)?.type).toBe('success');
  });
});
