'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import type { Product } from '@/lib/types';

const DEFAULT_PAGE_SIZE = 12;

interface UsePaginatedProductsOptions {
  /** Omit or null to load products across all categories. */
  categoryId?: string | null;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
  queryKeyPrefix: string;
}

export function usePaginatedProducts({
  categoryId,
  pageSize = DEFAULT_PAGE_SIZE,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  enabled = true,
  queryKeyPrefix,
}: UsePaginatedProductsOptions) {
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const query = useQuery({
    queryKey: [queryKeyPrefix, categoryId ?? 'all', page, sortBy, sortOrder],
    queryFn: () =>
      storeApi.getProducts({
        categoryId: categoryId ?? undefined,
        page,
        limit: pageSize,
        sortBy,
        sortOrder,
      }),
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    setPage(1);
    setAllProducts([]);
  }, [categoryId, sortBy, sortOrder]);

  useEffect(() => {
    if (!query.data?.products) return;
    setAllProducts((prev) => {
      if (page === 1) return query.data!.products;
      const existingIds = new Set(prev.map((p) => p.id));
      const next = query.data!.products.filter((p) => !existingIds.has(p.id));
      return [...prev, ...next];
    });
  }, [query.data, page]);

  const total = query.data?.total ?? 0;
  const hasMore = allProducts.length < total;

  const loadMore = useCallback(() => {
    if (!query.isFetching && hasMore) {
      setPage((p) => p + 1);
    }
  }, [query.isFetching, hasMore]);

  const isInitialLoading = query.isLoading && page === 1;
  const isLoadingMore = query.isFetching && page > 1;

  return {
    products: allProducts,
    query,
    hasMore,
    loadMore,
    isInitialLoading,
    isLoadingMore,
    page,
    total,
  };
}
