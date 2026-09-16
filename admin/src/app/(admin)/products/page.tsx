'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import type { Product } from '@/lib/types';
import { buildActiveCategoryTabs } from '@/lib/category-tabs';
import { getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useToast } from '@/stores/toast-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductDetailsModal } from '@/components/products/ProductDetailsModal';
import { ProductCategoryTabs } from '@/components/products/ProductCategoryTabs';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryTabs, setCategoryTabs] = useState<ReturnType<typeof buildActiveCategoryTabs>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const toast = useToast((s) => s.show);
  const limit = 12;

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const categories = await adminApi.getCategories();
        if (cancelled) return;
        setCategoryTabs(buildActiveCategoryTabs(categories));

        const allRes = await adminApi.getProducts({ page: 1, limit: 1, includeInactive: true });
        if (cancelled) return;
        setAllCount(allRes.total);
      } catch {
        if (!cancelled) setCategoryTabs([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getProducts({
        page,
        limit,
        includeInactive: true,
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
      });
      let list = res.products;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(q));
      }
      setProducts(list);
      setTotal(res.total);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
  };

  const handleToggleAvailability = async (product: Product, available: boolean) => {
    setTogglingId(product.id);
    try {
      await adminApi.updateProduct(product.id, { isAvailable: available });
      toast(available ? 'تم تفعيل توفر المنتج' : 'تم إيقاف توفر المنتج', 'success');
      load();
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deleteProduct(deleteId);
      toast('تم حذف المنتج', 'success');
      setDeleteId(null);
      setDetailsProduct(null);
      load();
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  const emptyMessage = useMemo(() => {
    if (search.trim()) return 'لا توجد نتائج للبحث';
    if (selectedCategoryId) return 'لا توجد منتجات في هذا التصنيف';
    return 'لا توجد منتجات. ابدأ بإضافة منتج جديد.';
  }, [search, selectedCategoryId]);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="المنتجات"
        action={
          <Link href="/products/new" className="btn-primary min-h-[48px] w-full sm:w-auto text-base">
            <Plus className="w-4 h-4 ml-2" /> منتج جديد
          </Link>
        }
      />

      <ProductCategoryTabs
        selectedId={selectedCategoryId}
        allCount={allCount}
        categories={categoryTabs}
        loading={categoriesLoading}
        onSelect={handleCategorySelect}
      />

      <div className="card mb-6 p-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            className="input pr-10"
            placeholder="بحث بالاسم..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {loading && (
        <div className="space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4 sm:space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-0 overflow-hidden min-w-0">
              <div className="skeleton aspect-[5/3] sm:aspect-[4/3] w-full rounded-none max-h-44 sm:max-h-none" />
              <div className="p-3 sm:p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && products.length === 0 && (
        <EmptyState message={emptyMessage} />
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <div className="space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4 sm:space-y-0">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                toggling={togglingId === p.id}
                onToggleAvailability={handleToggleAvailability}
                onDelete={setDeleteId}
                onOpenDetails={setDetailsProduct}
              />
            ))}
          </div>

          {pages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                type="button"
                className="btn-secondary min-h-[44px]"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                السابق
              </button>
              <span className="text-sm text-gray-600">
                {page} / {pages}
              </span>
              <button
                type="button"
                className="btn-secondary min-h-[44px]"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}

      <ProductDetailsModal
        product={detailsProduct}
        onClose={() => setDetailsProduct(null)}
        onDelete={setDeleteId}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المنتج"
        message="هل أنت متأكد؟ لا يمكن الحذف إذا كان المنتج مرتبطاً بطلبات قيد المعالجة."
        danger
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
