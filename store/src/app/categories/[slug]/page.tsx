'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { recordCustomerEvent } from '@/lib/customer-events';
import { CategoriesShell, useCategoriesPageActions } from '@/components/categories/CategoriesShell';
import { CategoryProductView } from '@/components/categories/CategoryProductView';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';

export default function CategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const {
    catLoading,
    qtyMap,
    favoriteIds,
    hasBehavioralData,
    handleAddToCart,
    handleQuantityAdjust,
    handleToggleFavorite,
  } = useCategoriesPageActions();

  const {
    data: category,
    isLoading: categoryLoading,
    error: categoryError,
    refetch,
  } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => storeApi.getCategoryBySlug(slug),
    enabled: !!slug,
  });

  useEffect(() => {
    if (!category) return;
    recordCustomerEvent({
      type: 'CATEGORY_VIEWED',
      categoryId: category.id,
      context: category.slug,
      source: 'category',
    });
  }, [category?.id, category?.slug]);

  return (
    <CategoriesShell activeSlug={slug ?? null}>
      {categoryLoading || catLoading ? (
        <ProductGridSkeleton count={4} />
      ) : categoryError ? (
        <ErrorState
          message="صار معنا مشكلة بسيطة، جرب مرة ثانية."
          onRetry={() => refetch()}
        />
      ) : !category ? (
        <div className="py-10 text-center">
          <p className="text-gray-600 mb-4">التصنيف غير موجود</p>
          <Link
            href="/categories"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-primary-500 text-gray-900 text-sm font-semibold hover:bg-primary-600"
          >
            العودة للأقسام
          </Link>
        </div>
      ) : (
        <CategoryProductView
          category={category}
          qtyMap={qtyMap}
          onAddToCart={handleAddToCart}
          onQuantityAdjust={handleQuantityAdjust}
          onToggleFavorite={handleToggleFavorite}
          favoriteIds={favoriteIds}
          hasBehavioralData={hasBehavioralData}
        />
      )}
    </CategoriesShell>
  );
}
