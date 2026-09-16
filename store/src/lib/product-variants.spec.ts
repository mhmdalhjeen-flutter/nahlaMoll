import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { groupVariantsByType, getVariantLabel, hasProductVariants, getDefaultProductVariant } from './product-variants';
import type { ProductVariant } from './types';
import { getMaxPurchaseQuantity } from '@/components/product/detail/ProductPurchasePanel';
import type { Product } from './types';

const sampleVariants: ProductVariant[] = [
  { id: '1', name: 'أسود', value: 'أسود', type: 'اللون', priceAdjustment: 0, stock: 5 },
  { id: '2', name: '', value: 'أبيض', type: 'اللون', priceAdjustment: 0, stock: 0 },
  { id: '3', name: 'M', value: 'M', type: 'المقاس', priceAdjustment: 2, stock: 8 },
];

describe('product-variants', () => {
  it('groups variants by type', () => {
    const groups = groupVariantsByType(sampleVariants);
    expect(groups.get('اللون')?.length).toBe(2);
    expect(groups.get('المقاس')?.length).toBe(1);
  });

  it('getVariantLabel falls back to value when name empty', () => {
    expect(getVariantLabel(sampleVariants[1])).toBe('أبيض');
  });

  it('hasProductVariants detects non-empty arrays', () => {
    expect(hasProductVariants(sampleVariants)).toBe(true);
    expect(hasProductVariants([])).toBe(false);
  });
});

describe('getDefaultProductVariant', () => {
  const baseProduct = {
    availability: 'LIMITED' as const,
    isAvailable: true,
    stock: 0,
    variants: sampleVariants,
  };

  it('selects first purchasable variant', () => {
    expect(getDefaultProductVariant(baseProduct)?.id).toBe('1');
  });

  it('skips unavailable first variant', () => {
    const variants = [
      { id: 'a', name: 'X', value: 'X', type: 'اللون', priceAdjustment: 0, stock: 0 },
      { id: 'b', name: 'Y', value: 'Y', type: 'اللون', priceAdjustment: 0, stock: 4 },
    ];
    expect(getDefaultProductVariant({ ...baseProduct, variants })?.id).toBe('b');
  });

  it('returns null when all variants unavailable', () => {
    const variants = [
      { id: 'a', name: 'X', value: 'X', type: 'اللون', priceAdjustment: 0, stock: 0 },
      { id: 'b', name: 'Y', value: 'Y', type: 'اللون', priceAdjustment: 0, stock: 0 },
    ];
    expect(getDefaultProductVariant({ ...baseProduct, variants })).toBeNull();
  });

  it('returns null when product has no variants', () => {
    expect(getDefaultProductVariant({ ...baseProduct, variants: [] })).toBeNull();
  });

  it('respects unlimited availability for zero-stock variant', () => {
    const variants = [
      { id: 'a', name: 'X', value: 'X', type: 'اللون', priceAdjustment: 0, stock: 0 },
    ];
    expect(
      getDefaultProductVariant({
        availability: 'UNLIMITED',
        isAvailable: true,
        stock: 0,
        variants,
      })?.id,
    ).toBe('a');
  });
});

describe('getMaxPurchaseQuantity', () => {
  const base: Product = {
    id: 'p',
    name: 'P',
    description: '',
    price: 10,
    freeDeliveryValue: 0,
    availability: 'LIMITED',
    stock: 10,
    isAvailable: true,
    isActive: true,
    isRecommended: false,
    images: [],
  };

  it('uses variant stock when selected', () => {
    expect(getMaxPurchaseQuantity(base, sampleVariants[0])).toBe(5);
  });

  it('returns undefined for unlimited products', () => {
    expect(getMaxPurchaseQuantity({ ...base, availability: 'UNLIMITED' }, sampleVariants[0])).toBeUndefined();
  });
});
