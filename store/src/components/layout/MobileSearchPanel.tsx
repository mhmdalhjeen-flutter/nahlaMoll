'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { useCartMap } from '@/hooks/useCartMap';
import { useGuardedCartActions } from '@/hooks/useGuardedCartActions';
import type { Product } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { ProductGrid } from '@/components/product/ProductGrid';
import { cn } from '@/lib/utils';
import { useShellUi } from './ShellUiContext';

export function MobileSearchPanel() {
  const { searchOpen: open, setSearchOpen, searchQuery, setSearchQuery } = useShellUi();
  const onClose = () => setSearchOpen(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [debounced, setDebounced] = useState('');
  const { qtyMap } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();

  useEffect(() => {
    if (!open) {
      setDebounced('');
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, setSearchOpen]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => storeApi.searchProducts(debounced),
    enabled: open && debounced.length >= 2,
  });
  const products = data?.products ?? [];

  const handleAddToCart = (product: Product, variantId?: string) => {
    add(product, variantId);
  };

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="إغلاق البحث"
      />

      <div
        className={cn(
          'relative bg-white shadow-lg border-b border-gray-100',
          'animate-in fade-in slide-in-from-top-2 duration-200',
        )}
      >
        <div className="px-4 py-3 flex items-center gap-2 safe-area-top">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder="ابحث عن منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 min-h-[48px] text-base"
              aria-label="بحث"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-primary-100"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto bg-gray-50 px-4 py-4 pb-24">
        {debounced.length < 2 && (
          <p className="text-center text-sm text-gray-500 py-8">اكتب حرفين على الأقل للبحث</p>
        )}
        {isFetching && debounced.length >= 2 && (
          <p className="text-center text-sm text-gray-500 py-4">جاري البحث...</p>
        )}
        {data && debounced.length >= 2 && products.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-8">لا توجد نتائج لـ «{debounced}»</p>
        )}
        {products.length > 0 && (
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

/** Desktop search overlay — synced with header search field */
export function DesktopSearchPanel() {
  const { searchOpen: open, setSearchOpen, searchQuery, setSearchQuery } = useShellUi();
  const onClose = () => setSearchOpen(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [debounced, setDebounced] = useState('');
  const { qtyMap } = useCartMap();
  const { add, adjustQuantity } = useGuardedCartActions();

  useEffect(() => {
    if (!open) {
      setDebounced('');
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, setSearchOpen]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => storeApi.searchProducts(debounced),
    enabled: open && debounced.length >= 2,
  });
  const products = data?.products ?? [];

  if (!open) return null;

  return (
    <div className="hidden md:flex fixed inset-0 z-50 flex-col">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="إغلاق البحث"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="نتائج البحث"
        className="relative mx-auto mt-[4.5rem] w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[min(80vh,720px)] flex flex-col mx-4 lg:mx-auto border border-gray-100"
      >
        <div className="p-4 border-b border-gray-100 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder="ابحث عن منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 min-h-[48px]"
              aria-label="بحث"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm min-h-[44px] shrink-0"
          >
            إغلاق
          </button>
        </div>
        <div className="overflow-y-auto p-4 lg:p-6 flex-1 bg-gray-50/50">
          {debounced.length < 2 && (
            <p className="text-gray-500 text-sm text-center py-6">اكتب حرفين على الأقل للبحث</p>
          )}
          {isFetching && debounced.length >= 2 && (
            <p className="text-sm text-gray-500 text-center py-4">جاري البحث...</p>
          )}
          {data && products.length === 0 && debounced.length >= 2 && (
            <p className="text-gray-500 text-center py-6">لا توجد نتائج لـ «{debounced}»</p>
          )}
          {products.length > 0 && (
            <ProductGrid
              products={products}
              qtyMap={qtyMap}
              onAddToCart={(p, v) => add(p, v)}
              onQuantityAdjust={(id, d) => adjustQuantity(id, d)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
