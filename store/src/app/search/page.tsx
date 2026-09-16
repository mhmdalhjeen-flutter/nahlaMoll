'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { recordCustomerEvent } from '@/lib/customer-events';
import { useCartMap } from '@/hooks/useCartMap';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';
import type { Product } from '@/lib/types';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery.trim());
  const { qtyMap } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setQuery(q);
    setDebounced(q.trim());
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => storeApi.searchProducts(debounced),
    enabled: debounced.length >= 2,
  });
  const products = data?.products ?? [];

  useEffect(() => {
    if (debounced.length < 2) return;
    recordCustomerEvent({
      type: 'SEARCH_QUERY',
      searchTerm: debounced,
      source: 'search',
    });
  }, [debounced]);

  useEffect(() => {
    if (debounced.length >= 2 && products.length === 0 && !isFetching && data) {
      recordCustomerEvent({
        type: 'SEARCH_NO_RESULTS',
        searchTerm: debounced,
        source: 'search',
      });
    }
  }, [debounced, products.length, data, isFetching]);

  const handleAddToCart = (product: Product, variantId?: string) => {
    add(product, variantId);
  };

  return (
    <div className="container mx-auto px-4 lg:px-6 py-6 max-w-6xl">
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-gray-900">بحث</h1>
      <div className="relative mb-6 max-w-xl">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <Input
          placeholder="ابحث عن منتج..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-10 min-h-[44px] md:min-h-[48px]"
          aria-label="بحث عن منتج"
        />
      </div>
      {debounced.length < 2 && (
        <p className="text-gray-500 text-sm">اكتب حرفين على الأقل للبحث</p>
      )}
      {isFetching && debounced.length >= 2 && (
        <p className="text-sm text-gray-500">جاري البحث...</p>
      )}
      {data && debounced.length >= 2 && (
        products.length === 0 ? (
          <p className="text-gray-500">لا توجد نتائج لـ «{debounced}»</p>
        ) : (
          <ProductGrid
            products={products}
            qtyMap={qtyMap}
            onAddToCart={handleAddToCart}
            onQuantityAdjust={(itemId, delta) => adjustQuantity(itemId, delta)}
            onProductNavigate={(product) =>
              recordCustomerEvent({
                type: 'SEARCH_RESULT_CLICK',
                productId: product.id,
                categoryId: product.categoryId,
                searchTerm: debounced,
                source: 'search',
              })
            }
          />
        )
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-6 max-w-6xl text-gray-500">جاري التحميل...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
