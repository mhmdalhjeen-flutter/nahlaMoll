'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { Category, Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-url';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { LoadMoreSentinel } from '@/components/ui/LoadMoreSentinel';

const PAGE_SIZE = 12;

type CartQtyMap = Map<string, { itemId: string; quantity: number; variantId?: string | null }>;

interface AllCategoriesSplitViewProps {
  categories: Category[];
  loading?: boolean;
  qtyMap: CartQtyMap;
  onAddToCart: (product: Product, variantId?: string) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
}

/**
 * Unified All Categories layout (RTL):
 * ┌ الأقسام (~20%) │ المنتجات (~80%) ───────┐
 * Each column is an independent vertical scroll container inside a fixed viewport.
 */
export function AllCategoriesSplitView({
  categories,
  loading,
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
}: AllCategoriesSplitViewProps) {
  const [productsScrollEl, setProductsScrollEl] = useState<HTMLDivElement | null>(null);

  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCategoryId || rootCategories.length === 0) return;
    const firstWithProducts = rootCategories.find((c) => (c._count?.products ?? 0) > 0);
    setSelectedCategoryId(firstWithProducts?.id ?? rootCategories[0]?.id ?? null);
  }, [rootCategories, selectedCategoryId]);

  const {
    products: allProducts,
    query: productsQuery,
    hasMore,
    loadMore,
    isInitialLoading,
    isLoadingMore,
  } = usePaginatedProducts({
    categoryId: selectedCategoryId,
    pageSize: PAGE_SIZE,
    queryKeyPrefix: 'all-categories-products',
  });

  const selectedCategory = rootCategories.find((c) => c.id === selectedCategoryId);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 h-full w-full overflow-hidden">
        <aside className="w-[20%] min-w-[68px] max-w-[96px] shrink-0 h-full min-h-0 flex flex-col overflow-hidden border-l border-gray-200 bg-gray-50/90">
          <div className="shrink-0 border-b border-gray-200 px-2 py-2">
            <div className="skeleton h-3 w-10 rounded" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-gray-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 px-2 py-3">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="skeleton h-3 w-full rounded" />
              </div>
            ))}
          </div>
        </aside>
        <main className="flex-1 min-w-0 min-h-0 h-full overflow-hidden p-2">
          <ProductGridSkeleton count={4} />
        </main>
      </div>
    );
  }

  if (rootCategories.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <EmptyState title="لا توجد تصنيفات" description="سيتم إضافة أصناف قريباً" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 h-full w-full overflow-hidden bg-white">
      {/* Categories panel — RIGHT in RTL (~20%) */}
      <aside
        className={cn(
          'w-[20%] min-w-[68px] max-w-[96px] sm:max-w-[108px] shrink-0',
          'h-full min-h-0 flex flex-col overflow-hidden',
          'bg-gray-50/90 border-l border-gray-200',
        )}
        aria-label="اختيار القسم"
      >
        <div className="shrink-0 px-2 py-1.5 border-b border-gray-200/90 bg-gray-100/60">
          <span className="block text-[10px] sm:text-[11px] font-semibold text-gray-600">
            الأقسام
          </span>
        </div>

        <nav
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y divide-y divide-gray-200/70"
          aria-label="قائمة الأقسام"
        >
          {rootCategories.map((category) => {
            const active = category.id === selectedCategoryId;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-2 px-2 py-3 text-center',
                  'h-auto min-h-[44px] touch-manipulation',
                  'transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
                  active
                    ? 'bg-primary-50 text-primary-700 border-l-2 border-l-primary-500'
                    : 'text-gray-700 hover:bg-white/80',
                )}
              >
                <CategoryNavThumb category={category} active={active} />
                <span
                  className={cn(
                    'block w-full text-[10px] sm:text-[11px] leading-snug line-clamp-2 px-0.5',
                    active ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {category.name}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Products panel — LEFT in RTL (~80%) */}
      <main className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden bg-white">
        <div className="shrink-0 px-2 sm:px-3 py-1.5 border-b border-gray-100 bg-white z-10">
          <span className="block text-[10px] sm:text-[11px] font-semibold text-gray-500 mb-0.5">
            المنتجات
          </span>
          {selectedCategory && (
            <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
              {selectedCategory.name}
            </p>
          )}
        </div>

        <div
          ref={setProductsScrollEl}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-1.5 py-2 sm:px-2 sm:py-2"
          aria-label="منتجات القسم"
        >
          {!selectedCategoryId || isInitialLoading ? (
            <ProductGridSkeleton count={4} />
          ) : productsQuery.isError ? (
            <ErrorState
              message="صار معنا مشكلة بسيطة، جرب مرة ثانية."
              onRetry={() => productsQuery.refetch()}
            />
          ) : allProducts.length === 0 ? (
            <EmptyState
              title="لا يوجد منتجات هنا حاليًا."
              description="جرّب تصنيفاً آخر"
            />
          ) : (
            <>
              <ProductGrid
                products={allProducts}
                qtyMap={qtyMap}
                onAddToCart={onAddToCart}
                onQuantityAdjust={onQuantityAdjust}
                onToggleFavorite={onToggleFavorite}
                favoriteIds={favoriteIds}
                layout="split"
              />
              <LoadMoreSentinel
                hasMore={hasMore}
                isLoading={isLoadingMore}
                onLoadMore={loadMore}
                scrollRoot={productsScrollEl}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function CategoryNavThumb({ category, active }: { category: Category; active: boolean }) {
  if (category.image) {
    return (
      <div
        className={cn(
          'relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl overflow-hidden border mx-auto',
          active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-gray-200',
        )}
      >
        <Image
          src={getOptimizedImageUrl(category.image, 'thumbnail')}
          alt=""
          fill
          className="object-cover"
          sizes="44px"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center border text-xs font-bold mx-auto',
        active
          ? 'bg-primary-100 border-primary-200 text-primary-700 ring-2 ring-primary-100'
          : 'bg-white border-gray-200 text-primary-500',
      )}
    >
      {category.name.charAt(0)}
    </div>
  );
}
