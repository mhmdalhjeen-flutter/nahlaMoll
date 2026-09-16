import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductVariantSelector } from '@/components/product/detail/ProductVariantSelector';
import type { Product } from '@/lib/types';

const productWithVariants: Product = {
  id: 'p1',
  name: 'Test',
  description: '',
  price: 50,
  freeDeliveryValue: 10,
  availability: 'LIMITED',
  stock: 0,
  isAvailable: true,
  isActive: true,
  isRecommended: false,
  images: [],
  variants: [
    { id: 'v1', name: 'أسود', value: 'أسود', type: 'اللون', priceAdjustment: 0, stock: 5 },
    { id: 'v2', name: '', value: 'أبيض', type: 'اللون', priceAdjustment: 0, stock: 2 },
    { id: 'v3', name: 'L', value: 'L', type: 'المقاس', priceAdjustment: 0, stock: 8 },
  ],
};

describe('ProductVariantSelector', () => {
  it('returns null when no variants', () => {
    const html = renderToStaticMarkup(
      <ProductVariantSelector
        product={{ ...productWithVariants, variants: [] }}
        selected={null}
        onSelect={() => {}}
      />,
    );
    expect(html).toBe('');
  });

  it('renders grouped variant options with labels', () => {
    const html = renderToStaticMarkup(
      <ProductVariantSelector product={productWithVariants} selected={null} onSelect={() => {}} />,
    );
    expect(html).toContain('اللون');
    expect(html).toContain('المقاس');
    expect(html).toContain('أسود');
    expect(html).toContain('أبيض');
    expect(html).toContain('L');
  });

  it('marks selected variant with brand styling', () => {
    const html = renderToStaticMarkup(
      <ProductVariantSelector
        product={productWithVariants}
        selected={productWithVariants.variants![0]}
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('border-primary-600');
  });
});
