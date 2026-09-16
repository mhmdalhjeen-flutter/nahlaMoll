import { describe, expect, it } from 'vitest';
import type { CartItem } from './types';
import {
  computeCartSubtotalFromItems,
  computeFreeDeliveryScoreFromItems,
  recalculateFreeDeliverySummary,
} from './optimistic-free-delivery';
import { FREE_DELIVERY_ELIGIBILITY_THRESHOLD } from './delivery.constants';

function item(productId: string, contribution: number, quantity: number): CartItem {
  return {
    id: `item-${productId}`,
    quantity,
    productId,
    product: {
      id: productId,
      name: 'Test',
      description: '',
      price: 10,
      freeDeliveryValue: contribution,
      availability: 'UNLIMITED',
      stock: 0,
      isAvailable: true,
      isActive: true,
      isRecommended: false,
      images: [],
    },
  };
}

const baseSummary = {
  actualScore: 0,
  displayedScore: 0,
  target: 100,
  progressPercentage: 0,
  partialEnabled: false,
  partialThreshold: 0,
  partialDiscount: 0,
  originalDeliveryFee: 20,
  deliveryFee: 20,
  deliveryDiscount: 0,
  isFreeDelivery: false,
  isPartialFreeDelivery: false,
  areaEligibility: true,
  remainingScore: 100,
  subtotal: 0,
  totalItems: 0,
  itemCount: 0,
};

describe('optimistic-free-delivery', () => {
  describe('computeFreeDeliveryScoreFromItems', () => {
    it.each([
      [0, 0],
      [50, 50],
      [94, 94],
      [95, 95],
      [100, 100],
      [120, 120],
      [250, 250],
    ])('contribution %s × qty 1 = %s', (contribution, expected) => {
      expect(computeFreeDeliveryScoreFromItems([item('a', contribution, 1)])).toBe(expected);
    });

    it('60 × 2 = 120', () => {
      expect(computeFreeDeliveryScoreFromItems([item('a', 60, 2)])).toBe(120);
    });

    it('40 + 55 = 95', () => {
      expect(
        computeFreeDeliveryScoreFromItems([item('a', 40, 1), item('b', 55, 1)]),
      ).toBe(95);
    });
  });

  describe('recalculateFreeDeliverySummary', () => {
    it.each([
      [94, false, 94, 94],
      [95, true, 95, 95],
      [100, true, 100, 100],
      [120, true, 100, 100],
      [250, true, 100, 100],
    ])('raw=%s → free=%s, display=%s, progress=%s', (raw, free, display, progress) => {
      const result = recalculateFreeDeliverySummary([item('a', raw, 1)], baseSummary);
      expect(result.isFreeDelivery).toBe(free);
      expect(result.displayedScore).toBe(display);
      expect(result.progressPercentage).toBe(progress);
      expect(result.isPartialFreeDelivery).toBe(false);
      if (free) {
        expect(result.deliveryFee).toBe(0);
      } else {
        expect(result.deliveryFee).toBe(20);
      }
    });

    it('removal: 60×2 then 60×1', () => {
      const full = recalculateFreeDeliverySummary([item('a', 60, 2)], baseSummary);
      expect(full.isFreeDelivery).toBe(true);
      const reduced = recalculateFreeDeliverySummary([item('a', 60, 1)], baseSummary);
      expect(reduced.actualScore).toBe(60);
      expect(reduced.isFreeDelivery).toBe(false);
    });

    it('does not grant free delivery when area ineligible', () => {
      const result = recalculateFreeDeliverySummary([item('a', 100, 1)], {
        ...baseSummary,
        areaEligibility: false,
      });
      expect(result.isFreeDelivery).toBe(false);
      expect(result.deliveryFee).toBe(20);
    });

    it('uses 95% eligibility threshold', () => {
      expect(FREE_DELIVERY_ELIGIBILITY_THRESHOLD).toBe(95);
    });

    it('recalculates subtotal immediately from cart line prices', () => {
      const lineA = item('a', 40, 2);
      lineA.product.price = 20;
      const lineB = item('b', 55, 1);
      lineB.product.price = 15;

      expect(computeCartSubtotalFromItems([lineA, lineB])).toBe(55);
      expect(
        recalculateFreeDeliverySummary([lineA, lineB], baseSummary).subtotal,
      ).toBe(55);
    });
  });
});
