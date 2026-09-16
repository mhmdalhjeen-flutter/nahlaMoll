import { describe, expect, it } from 'vitest';
import { canProductCompleteFreeDelivery } from './product-detail-free-delivery';
import { parseProductSpecifications } from './product-meta';

describe('product-detail-free-delivery', () => {
  it('returns true when product contribution meets remaining score', () => {
    expect(
      canProductCompleteFreeDelivery({
        freeDeliveryValue: 15,
        quantity: 1,
        cartSummary: {
          remainingScore: 10,
          progressPercentage: 85,
          isFreeDelivery: false,
          areaEligibility: true,
        },
      }),
    ).toBe(true);
  });

  it('returns false when cart already eligible', () => {
    expect(
      canProductCompleteFreeDelivery({
        freeDeliveryValue: 20,
        quantity: 1,
        cartSummary: {
          remainingScore: 5,
          progressPercentage: 96,
          isFreeDelivery: true,
          areaEligibility: true,
        },
      }),
    ).toBe(false);
  });

  it('returns false for zero contribution', () => {
    expect(
      canProductCompleteFreeDelivery({
        freeDeliveryValue: 0,
        quantity: 1,
        cartSummary: {
          remainingScore: 10,
          progressPercentage: 50,
          isFreeDelivery: false,
          areaEligibility: true,
        },
      }),
    ).toBe(false);
  });
});

describe('parseProductSpecifications', () => {
  it('parses spec tags', () => {
    expect(
      parseProductSpecifications(['spec:النوع|لاسلكي', 'unit:قطعة']),
    ).toEqual([{ label: 'النوع', value: 'لاسلكي' }]);
  });
});
