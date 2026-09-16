'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { useToastStore } from '@/stores/toast-store';
import { getErrorMessage } from '@/lib/utils';
import type { Product } from '@/lib/types';

export default function FavoritesPage() {
  return (
    <AuthGuard>
      <FavoritesContent />
    </AuthGuard>
  );
}

function FavoritesContent() {
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => storeApi.getFavorites({ limit: 100 }),
  });

  const removeFav = useMutation({
    mutationFn: (productId: string) => storeApi.removeFavorite(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      toast('تمت الإزالة من المفضلة', 'info');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const products: Product[] = (data?.items ?? []).map((f) => f.product);

  if (isLoading) return <div className="container mx-auto px-4 py-6"><ProductGridSkeleton /></div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">المفضلة</h1>
      {products.length === 0 ? (
        <EmptyState
          title="لا توجد منتجات في المفضلة"
          action={<Link href="/products" className="btn-primary px-4 py-2 rounded-xl">تصفح المنتجات</Link>}
        />
      ) : (
        <ProductGrid
          products={products}
          favoriteIds={new Set(products.map((p) => p.id))}
          onToggleFavorite={(p) => removeFav.mutate(p.id)}
        />
      )}
    </div>
  );
}
