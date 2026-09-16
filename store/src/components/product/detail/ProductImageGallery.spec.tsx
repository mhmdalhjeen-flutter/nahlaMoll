import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductImageGallery } from '@/components/product/detail/ProductImageGallery';

describe('ProductImageGallery', () => {
  it('renders single image without thumbnail strip', () => {
    const html = renderToStaticMarkup(
      <ProductImageGallery images={['https://example.com/a.jpg']} alt="Test" />,
    );
    expect(html).not.toContain('role="tablist"');
  });

  it('renders thumbnail strip for multiple images', () => {
    const html = renderToStaticMarkup(
      <ProductImageGallery
        images={['https://example.com/a.jpg', 'https://example.com/b.jpg']}
        alt="Test"
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('الصورة 1 من 2');
    expect(html).toContain('الصورة 2 من 2');
    expect(html).not.toContain('rounded-full transition-all min-w-[24px]');
  });
});
