'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';

interface ProductHorizontalSectionProps {
  title: string;
  products: Product[];
  excludeProductId?: string;
  qtyMap?: Map<string, { itemId: string; quantity: number; variantId?: string | null }>;
  onAddToCart?: (product: Product, variantId?: string) => void;
  onQuantityAdjust?: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
  viewAllHref?: string;
}

export function ProductHorizontalSection({
  title,
  products,
  excludeProductId,
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
  viewAllHref,
}: ProductHorizontalSectionProps) {
  const filtered = products.filter((p) => p.id !== excludeProductId);

  if (filtered.length < 2) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base md:text-lg font-bold text-gray-900">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-xs md:text-sm font-semibold text-primary-600 shrink-0">
            عرض الكل
          </Link>
        )}
      </div>
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-4 w-max pb-1">
          {filtered.slice(0, 8).map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[280px] sm:w-[300px]"
            >
              <ProductCard
                product={product}
                qtyMap={qtyMap}
                onAddToCart={onAddToCart}
                onQuantityAdjust={onQuantityAdjust}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favoriteIds?.has(product.id)}
                layout="feed"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
