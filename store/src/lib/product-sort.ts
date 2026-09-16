import type { Product } from '@/lib/types';
import { isOfferActive } from '@/lib/product-meta';

function priorityScore(product: Product): number {
  if (product.isRecommended) return 0;
  if (isOfferActive(product)) return 1;
  return 2;
}

export function sortProductsByPriority(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const diff = priorityScore(a) - priorityScore(b);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'ar');
  });
}
