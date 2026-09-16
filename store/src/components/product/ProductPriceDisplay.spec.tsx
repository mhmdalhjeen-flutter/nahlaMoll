import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductPriceDisplay } from './ProductPriceDisplay';
import type { Product } from '@/lib/types';

const baseProduct: Product = {
  id: 'p1',
  name: 'Test',
  description: 'd',
  price: '100',
  freeDeliveryValue: '10',
  availability: 'UNLIMITED',
  stock: 5,
  isAvailable: true,
  isActive: true,
  isRecommended: false,
  images: [],
  hasOffer: true,
  offerType: 'PERCENTAGE',
  offerValue: '20',
  tags: ['offerKind:PERCENTAGE'],
};

describe('ProductPriceDisplay card layout', () => {
  it('shows gray strikethrough and discount badge for offers', () => {
    const html = renderToStaticMarkup(
      <ProductPriceDisplay product={baseProduct} layout="card" />,
    );
    expect(html).toContain('line-through');
    expect(html).toContain('text-gray-400');
    expect(html).toContain('خصم 20%');
    expect(html).not.toContain('text-error-500');
  });

  it('shows single price when no discount', () => {
    const product = { ...baseProduct, hasOffer: false, offerType: null, offerValue: null };
    const html = renderToStaticMarkup(
      <ProductPriceDisplay product={product} layout="card" />,
    );
    expect(html).toContain('100');
    expect(html).not.toContain('line-through');
  });
});
