'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Category, Product } from '@/lib/types';
import { sortProductsByPriority } from '@/lib/product-sort';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { LoadMoreSentinel } from '@/components/ui/LoadMoreSentinel';

const INITIAL_HOME_BATCH = 8;
const HOME_PAGE_SIZE = 8;
const CATEGORIES_PAGE_SIZE = 12;

type CartQtyMap = Map<string, { itemId: string; quantity: number; variantId?: string | null }>;

interface InfiniteCategorySectionProps {
  category: Category;
  queryKeyPrefix: string;
  pageSize: number;
  qtyMap: CartQtyMap;
  onCartAction: (product: Product, variantId?: string) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
  showViewAllLink?: boolean;
}

function InfiniteCategorySection({
  category,
  queryKeyPrefix,
  pageSize,
  qtyMap,
  onCartAction,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
  showViewAllLink = true,
}: InfiniteCategorySectionProps) {
  const {
    products,
    query,
    hasMore,
    loadMore,
    isInitialLoading,
    isLoadingMore,
  } = usePaginatedProducts({
    categoryId: category.id,
    pageSize,
    queryKeyPrefix,
  });

  const displayProducts = useMemo(
    () => sortProductsByPriority(products),
    [products],
  );

  if (isInitialLoading) {
    return (
      <section className="mb-8">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded-full" />
          {category.name}
        </h2>
        <ProductGridSkeleton count={2} />
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="mb-8">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded-full" />
          {category.name}
        </h2>
        <ErrorState
          message={`تعذّر تحميل منتجات ${category.name}`}
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section id={`category-${category.id}`} className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 min-w-0">
          <span className="w-1 h-5 bg-primary-500 rounded-full shrink-0" />
          <span className="truncate">{category.name}</span>
        </h2>
        {showViewAllLink && (
          <Link
            href={`/categories/${category.slug}`}
            className="text-xs md:text-sm font-semibold text-primary-600 hover:text-primary-700 shrink-0"
          >
            عرض الكل
          </Link>
        )}
      </div>
      <ProductGrid
        products={displayProducts}
        qtyMap={qtyMap}
        onAddToCart={onCartAction}
        onQuantityAdjust={onQuantityAdjust}
        onToggleFavorite={onToggleFavorite}
        favoriteIds={favoriteIds}
        layout="list"
      />
      <LoadMoreSentinel
        hasMore={hasMore}
        isLoading={isLoadingMore}
        onLoadMore={loadMore}
      />
    </section>
  );
}

interface CategoryProductSectionsProps {
  categories: Category[];
  qtyMap: CartQtyMap;
  onCartAction: (product: Product, variantId?: string) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
  /** Limit visible categories; omit to show all root categories with products. */
  maxCategories?: number;
  queryKeyPrefix?: string;
  pageSize?: number;
  showViewAllLink?: boolean;
  className?: string;
}

export function CategoryProductSections({
  categories,
  qtyMap,
  onCartAction,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
  maxCategories,
  queryKeyPrefix = 'category-section-products',
  pageSize = CATEGORIES_PAGE_SIZE,
  showViewAllLink = true,
  className,
}: CategoryProductSectionsProps) {
  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

  const visibleCategories = useMemo(() => {
    const withProducts = rootCategories.filter((c) => (c._count?.products ?? 0) > 0);
    if (maxCategories != null) {
      return withProducts.slice(0, maxCategories);
    }
    return withProducts;
  }, [rootCategories, maxCategories]);

  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {visibleCategories.map((category) => (
        <InfiniteCategorySection
          key={category.id}
          category={category}
          queryKeyPrefix={queryKeyPrefix}
          pageSize={pageSize}
          qtyMap={qtyMap}
          onCartAction={onCartAction}
          onQuantityAdjust={onQuantityAdjust}
          onToggleFavorite={onToggleFavorite}
          favoriteIds={favoriteIds}
          showViewAllLink={showViewAllLink}
        />
      ))}
    </div>
  );
}

export const HOME_CATEGORY_SECTION_LIMIT = 4;
export const HOME_CATEGORY_PAGE_SIZE = HOME_PAGE_SIZE;
export const HOME_CATEGORY_INITIAL_BATCH = INITIAL_HOME_BATCH;
