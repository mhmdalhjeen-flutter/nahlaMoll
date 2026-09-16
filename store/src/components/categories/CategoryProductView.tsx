'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Category, Product } from '@/lib/types';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { LoadMoreSentinel } from '@/components/ui/LoadMoreSentinel';
import { CategoryFilterSortBar } from '@/components/categories/CategoryFilterSortBar';
import {
  applyCategoryProductFilters,
  applyCategoryProductSort,
  getApiSortParams,
  getDefaultCategorySort,
  type CategoryFilterState,
  type CategorySortOption,
} from '@/lib/category-product-filters';
import { cn } from '@/lib/utils';
import { recordCustomerEvent } from '@/lib/customer-events';

const PAGE_SIZE = 12;

type CartQtyMap = Map<string, { itemId: string; quantity: number; variantId?: string | null }>;

interface CategoryProductViewProps {
  category: Category;
  qtyMap: CartQtyMap;
  onAddToCart: (product: Product, variantId?: string) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
  hasBehavioralData: boolean;
}

export function CategoryProductView({
  category,
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
  hasBehavioralData,
}: CategoryProductViewProps) {
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<CategorySortOption>(() =>
    getDefaultCategorySort(hasBehavioralData),
  );
  const [filters, setFilters] = useState<CategoryFilterState>({
    offersOnly: false,
    freeDeliveryHelper: false,
  });

  const activeCategoryId = selectedSubcategoryId ?? category.id;

  const meaningfulSubcategories = useMemo(() => {
    return (category.children ?? []).filter((child) => (child._count?.products ?? 0) > 0);
  }, [category.children]);

  const apiSort = getApiSortParams(sort);

  const {
    products: allProducts,
    query: productsQuery,
    hasMore,
    loadMore,
    isInitialLoading,
    isLoadingMore,
  } = usePaginatedProducts({
    categoryId: activeCategoryId,
    pageSize: PAGE_SIZE,
    sortBy: apiSort.sortBy,
    sortOrder: apiSort.sortOrder,
    queryKeyPrefix: 'category-products',
  });

  const filteredProducts = useMemo(() => {
    const filtered = applyCategoryProductFilters(allProducts, filters);
    return applyCategoryProductSort(filtered, sort, hasBehavioralData);
  }, [allProducts, filters, sort, hasBehavioralData]);

  const handleFiltersChange = (next: CategoryFilterState) => {
    setFilters(next);
  };

  return (
    <div className="transition-opacity duration-200">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{category.name}</h1>

      {meaningfulSubcategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 -mx-1 px-1">
          <SubcategoryChip
            label="الكل"
            active={selectedSubcategoryId === null}
            onClick={() => setSelectedSubcategoryId(null)}
          />
          {meaningfulSubcategories.map((sub) => (
            <SubcategoryChip
              key={sub.id}
              label={sub.name}
              active={selectedSubcategoryId === sub.id}
              onClick={() => setSelectedSubcategoryId(sub.id)}
            />
          ))}
        </div>
      )}

      <CategoryFilterSortBar
        sort={sort}
        filters={filters}
        onSortChange={setSort}
        onFiltersChange={handleFiltersChange}
        showRelevanceSort={hasBehavioralData}
        showFreeDeliveryFilter
      />

      {isInitialLoading ? (
        <ProductGridSkeleton count={4} />
      ) : productsQuery.isError ? (
        <ErrorState
          message="صار معنا مشكلة بسيطة، جرب مرة ثانية."
          onRetry={() => productsQuery.refetch()}
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="لا يوجد منتجات هنا حاليًا."
          description="جرّب تصنيفاً آخر أو عدّل الفلترة"
          action={
            <Link
              href="/categories"
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-primary-500 text-gray-900 text-sm font-semibold hover:bg-primary-600"
            >
              تصفّح الأقسام
            </Link>
          }
        />
      ) : (
        <>
          <ProductGrid
            products={filteredProducts}
            qtyMap={qtyMap}
            onAddToCart={onAddToCart}
            onQuantityAdjust={onQuantityAdjust}
            onToggleFavorite={onToggleFavorite}
            favoriteIds={favoriteIds}
            layout="list"
            onProductNavigate={(product) =>
              recordCustomerEvent({
                type: 'PRODUCT_CLICKED',
                productId: product.id,
                categoryId: category.id,
                source: 'category',
              })
            }
          />

          <LoadMoreSentinel
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={loadMore}
            className="mt-4 pb-4"
          />
        </>
      )}
    </div>
  );
}

function SubcategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200',
        active
          ? 'bg-primary-50 text-primary-700 border border-primary-200 font-semibold'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent',
      )}
    >
      {label}
    </button>
  );
}
