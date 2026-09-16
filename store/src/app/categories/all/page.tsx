'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { StoreClosedBanner } from '@/components/store/StoreStatus';
import { FreeDeliveryJourney } from '@/components/home/FreeDeliveryJourney';
import { AllCategoriesHeader } from '@/components/categories/AllCategoriesHeader';
import { AllCategoriesSplitView } from '@/components/categories/AllCategoriesSplitView';
import { useCategoriesPageActions } from '@/components/categories/CategoriesShell';
import { ErrorState } from '@/components/ui/EmptyState';

export default function AllCategoriesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: storeApi.getCategories,
  });

  const {
    qtyMap,
    favoriteIds,
    handleAddToCart,
    handleQuantityAdjust,
    handleToggleFavorite,
  } = useCategoriesPageActions();

  useEffect(() => {
    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyHeight = document.body.style.height;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    return () => {
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.height = previousBodyHeight;
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-gray-50">
      <StoreClosedBanner className="shrink-0" />
      <AllCategoriesHeader />
      <FreeDeliveryJourney compact embedded className="shrink-0" />

      <div className="flex flex-1 min-h-0 h-0 overflow-hidden w-full">
        {error ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <ErrorState
              message="صار معنا مشكلة بسيطة، جرب مرة ثانية."
              onRetry={() => refetch()}
            />
          </div>
        ) : (
          <AllCategoriesSplitView
            categories={data ?? []}
            loading={isLoading}
            qtyMap={qtyMap}
            onAddToCart={handleAddToCart}
            onQuantityAdjust={handleQuantityAdjust}
            onToggleFavorite={handleToggleFavorite}
            favoriteIds={favoriteIds}
          />
        )}
      </div>
    </div>
  );
}
