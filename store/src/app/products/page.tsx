'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useCartMap } from '@/hooks/useCartMap';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import { Suspense, useMemo, useState } from 'react';
import type { DiscoverySectionType, Product } from '@/lib/types';

const SECTION_TITLES: Partial<Record<DiscoverySectionType | 'offers', string>> = {
  most_ordered: '🔥 الأكثر طلبًا',
  most_favorited: '❤️ الأكثر إضافة للمفضلة',
  personalized: '✨ ممكن تعجبك',
  free_delivery_boost: '🚚 منتجات ممكن تعجبك وتساعدك تكمل التوصيل المجاني.',
  offers: '🏷️ العروض',
};

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const sectionParam = searchParams.get('section');
  const section = sectionParam as DiscoverySectionType | 'offers' | null;
  const isOffersSection = section === 'offers';
  const isDiscoverySection =
    !!section && section !== 'offers' && section in SECTION_TITLES;
  const [page, setPage] = useState(1);
  const { qtyMap } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();

  const discoveryQuery = useQuery({
    queryKey: ['discovery-section', section, categoryId],
    queryFn: () =>
      storeApi.getDiscoveryFeed({
        categoryId,
        limit: 24,
      }),
    enabled: isDiscoverySection,
    staleTime: 60_000,
  });

  const offersQuery = useQuery({
    queryKey: ['products-offers-page', categoryId],
    queryFn: storeApi.getOffers,
    enabled: isOffersSection,
    staleTime: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ['products', page, categoryId],
    queryFn: () => storeApi.getProducts({ page, limit: 12, categoryId }),
    enabled: !section,
  });

  const sectionProducts = useMemo(() => {
    if (isOffersSection) return offersQuery.data ?? [];
    if (!isDiscoverySection || !discoveryQuery.data) return [];
    return (
      discoveryQuery.data.sections.find((s) => s.sectionType === section)?.products ?? []
    );
  }, [section, isOffersSection, isDiscoverySection, discoveryQuery.data, offersQuery.data]);

  const handleAddToCart = (product: Product, variantId?: string) => {
    add(product, variantId);
  };

  const isLoading = section
    ? isOffersSection
      ? offersQuery.isLoading
      : discoveryQuery.isLoading
    : listQuery.isLoading;
  const products = section ? sectionProducts : (listQuery.data?.products ?? []);
  const totalPages = listQuery.data ? Math.ceil(listQuery.data.total / (listQuery.data.pageSize || 12)) : 1;
  const title = section ? (SECTION_TITLES[section] ?? 'المنتجات') : 'المنتجات';

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      {isLoading ? (
        <ProductGridSkeleton />
      ) : (
        <>
          <ProductGrid
            products={products}
            qtyMap={qtyMap}
            onAddToCart={handleAddToCart}
            onQuantityAdjust={(itemId, delta) => adjustQuantity(itemId, delta)}
            layout="list"
          />
          {!section && totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button variant="outline" disabled={page <= 1 || listQuery.isFetching} onClick={() => setPage((p) => p - 1)}>
                السابق
              </Button>
              <span className="flex items-center px-3 text-sm">{page} / {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages || listQuery.isFetching} onClick={() => setPage((p) => p + 1)}>
                التالي
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}
