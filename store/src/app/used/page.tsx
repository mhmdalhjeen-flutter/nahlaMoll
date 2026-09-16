'use client';

import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useCartMap } from '@/hooks/useCartMap';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import type { Product } from '@/lib/types';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Recycle } from 'lucide-react';

export default function UsedProductsPage() {
  const { qtyMap } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['used-products'],
    queryFn: () => storeApi.getUsedProducts({ limit: 100 }),
  });

  const handleAddToCart = (product: Product, variantId?: string) => {
    add(product, variantId);
  };

  const products = data?.products ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-5 max-w-6xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
            <Recycle className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-xs text-navy-600 font-semibold mb-0.5">نحلة مول | Nahla Mall</p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">المستعمل</h1>
            <p className="text-sm text-gray-500 mt-0.5">منتجات مستعملة بحالة جيدة وبأسعار مناسبة</p>
          </div>
        </div>

        {isLoading && <ProductGridSkeleton count={6} />}

        {error && (
          <ErrorState message="تعذّر تحميل المنتجات المستعملة" onRetry={() => refetch()} />
        )}

        {!isLoading && !error && products.length === 0 && (
          <EmptyState
            title="لا توجد منتجات مستعملة حالياً"
            description="عد لاحقاً — قد تُضاف منتجات مستعملة قريباً"
          />
        )}

        {!isLoading && !error && products.length > 0 && (
          <ProductGrid
            products={products}
            qtyMap={qtyMap}
            onAddToCart={handleAddToCart}
            onQuantityAdjust={(itemId, delta) => adjustQuantity(itemId, delta)}
          />
        )}
      </div>
    </div>
  );
}
