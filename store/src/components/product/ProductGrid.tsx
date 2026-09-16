'use client';

import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { cn } from '@/lib/utils';

interface ProductGridProps {
  products: Product[];
  qtyMap?: Map<string, { itemId: string; quantity: number; variantId?: string | null }>;
  onAddToCart?: (product: Product, variantId?: string) => void;
  onQuantityAdjust?: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
  layout?: 'feed' | 'grid' | 'list' | 'row' | 'split';
  className?: string;
  onProductNavigate?: (product: Product) => void;
}

/** Standard responsive product grid — 2 columns on mobile for list/grid layouts. */
export function ProductGrid({
  products,
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
  layout = 'list',
  className,
  onProductNavigate,
}: ProductGridProps) {
  const isFeed = layout === 'feed';
  const isRow = layout === 'row';
  const isSplit = layout === 'split';

  const cardProps = (p: Product) => ({
    product: p,
    qtyMap,
    onAddToCart,
    onQuantityAdjust,
    onToggleFavorite,
    isFavorite: favoriteIds?.has(p.id),
    onProductNavigate,
  });

  if (isSplit) {
    return (
      <div
        className={cn(
          'flex flex-col gap-3',
          'md:grid md:grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] md:gap-4 lg:gap-5',
          className,
        )}
      >
        {products.map((p) => (
          <div key={p.id} className="contents">
            <div className="md:hidden">
              <ProductCard {...cardProps(p)} layout="row" />
            </div>
            <div className="hidden md:block h-auto">
              <ProductCard {...cardProps(p)} layout="list" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isRow) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {products.map((p) => (
          <ProductCard key={p.id} {...cardProps(p)} layout="row" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        isFeed
          ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-4 lg:gap-5'
          : 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 lg:gap-5',
        className,
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} {...cardProps(p)} layout={layout} />
      ))}
    </div>
  );
}
