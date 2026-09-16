'use client';

import { useMemo } from 'react';
import type { Product } from '@/lib/types';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { LoadMoreSentinel } from '@/components/ui/LoadMoreSentinel';

const PAGE_SIZE = 12;

type CartQtyMap = Map<string, { itemId: string; quantity: number; variantId?: string | null }>;

interface HomeGeneralFeedProps {
  excludeProductIds?: Set<string>;
  qtyMap: CartQtyMap;
  onAddToCart: (product: Product, variantId?: string) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
}

/** Diverse store-wide product feed — not grouped by category. */
export function HomeGeneralFeed({
  excludeProductIds,
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
}: HomeGeneralFeedProps) {
  const {
    products,
    query,
    hasMore,
    loadMore,
    isInitialLoading,
    isLoadingMore,
  } = usePaginatedProducts({
    categoryId: null,
    pageSize: PAGE_SIZE,
    queryKeyPrefix: 'home-general-feed',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const displayProducts = useMemo(() => {
    if (!excludeProductIds || excludeProductIds.size === 0) return products;
    return products.filter((product) => !excludeProductIds.has(product.id));
  }, [products, excludeProductIds]);

  if (isInitialLoading) {
    return (
      <div className="container mx-auto px-4 max-w-6xl pb-10">
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="container mx-auto px-4 max-w-6xl pb-10">
        <ErrorState
          message="تعذّر تحميل المنتجات"
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  if (displayProducts.length === 0 && !hasMore) {
    return (
      <div className="container mx-auto px-4 max-w-6xl pb-10">
        <EmptyState title="لا توجد منتجات" description="سيتم إضافة منتجات قريباً" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-6xl pb-10">
      <ProductGrid
        products={displayProducts}
        qtyMap={qtyMap}
        onAddToCart={onAddToCart}
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
    </div>
  );
}
