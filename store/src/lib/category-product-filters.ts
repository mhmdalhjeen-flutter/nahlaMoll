import type { Product } from '@/lib/types';
import { isOfferActive } from '@/lib/product-meta';
import { sortProductsByPriority } from '@/lib/product-sort';

export type CategorySortOption = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

export type CategoryFilterState = {
  offersOnly: boolean;
  freeDeliveryHelper: boolean;
  priceMin?: number;
  priceMax?: number;
};

export const CATEGORY_SORT_LABELS: Record<CategorySortOption, string> = {
  relevance: 'الأكثر مناسبة',
  newest: 'الأحدث',
  price_asc: 'السعر من الأقل للأعلى',
  price_desc: 'السعر من الأعلى للأقل',
};

export function getDefaultCategorySort(hasBehavioralData: boolean): CategorySortOption {
  return hasBehavioralData ? 'relevance' : 'newest';
}

export function getApiSortParams(sort: CategorySortOption): {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} {
  switch (sort) {
    case 'price_asc':
      return { sortBy: 'price', sortOrder: 'asc' };
    case 'price_desc':
      return { sortBy: 'price', sortOrder: 'desc' };
    case 'newest':
      return { sortBy: 'createdAt', sortOrder: 'desc' };
    case 'relevance':
    default:
      return { sortBy: 'createdAt', sortOrder: 'desc' };
  }
}

function parsePrice(value: string | number): number {
  return parseFloat(String(value)) || 0;
}

function parseFreeDeliveryValue(value: string | number): number {
  return parseFloat(String(value)) || 0;
}

/** Client-side filters supported without new backend work. */
export function applyCategoryProductFilters(
  products: Product[],
  filters: CategoryFilterState,
): Product[] {
  return products.filter((product) => {
    if (filters.offersOnly && !isOfferActive(product)) return false;

    if (filters.freeDeliveryHelper && parseFreeDeliveryValue(product.freeDeliveryValue) <= 0) {
      return false;
    }

    const price = parsePrice(product.price);
    if (filters.priceMin != null && price < filters.priceMin) return false;
    if (filters.priceMax != null && price > filters.priceMax) return false;

    return true;
  });
}

export function applyCategoryProductSort(
  products: Product[],
  sort: CategorySortOption,
  hasBehavioralData: boolean,
): Product[] {
  if (sort === 'relevance' && hasBehavioralData) {
    return sortProductsByPriority(products);
  }
  return products;
}

export function hasActiveCategoryFilters(filters: CategoryFilterState): boolean {
  return (
    filters.offersOnly ||
    filters.freeDeliveryHelper ||
    filters.priceMin != null ||
    filters.priceMax != null
  );
}
