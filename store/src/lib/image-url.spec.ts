import { describe, expect, it } from 'vitest';
import { getBackendOrigin, getOptimizedImageUrl, resolveMediaUrl } from './image-url';

describe('image-url', () => {
  it('resolves relative /uploads paths against backend origin', () => {
    const url = resolveMediaUrl('/uploads/products/abc.png');
    expect(url).toContain('localhost:3001');
    expect(url).toContain('/uploads/products/abc.png');
  });

  it('passes through cloudinary URLs', () => {
    const cloud =
      'https://res.cloudinary.com/demo/image/upload/v1/jaka/products/test.jpg';
    expect(resolveMediaUrl(cloud)).toBe(cloud);
  });

  it('passes through absolute backend upload URLs', () => {
    const absolute = 'http://localhost:3001/uploads/products/abc.png';
    expect(resolveMediaUrl(absolute)).toBe(absolute);
  });

  it('getOptimizedImageUrl resolves before cloudinary transforms', () => {
    const cloud =
      'https://res.cloudinary.com/demo/image/upload/v1/jaka/products/test.jpg';
    expect(getOptimizedImageUrl(cloud, 'card')).toContain('w_480');
  });

  it('getOptimizedImageUrl keeps local uploads resolved', () => {
    const result = getOptimizedImageUrl('/uploads/products/x.png', 'card');
    expect(result).toContain('/uploads/products/x.png');
    expect(result).toContain(getBackendOrigin());
  });
});
