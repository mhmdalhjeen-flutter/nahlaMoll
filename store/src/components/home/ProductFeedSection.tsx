'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { DiscoverySection, Product } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';
import { recordCustomerEvent } from '@/lib/customer-events';
import { getSectionProductIdsKey } from '@/lib/discovery-feed-stability';
import type { RecommendationTrackingContext } from '@/lib/customer-events.types';

type CartQtyMap = Map<string, { itemId: string; quantity: number; variantId?: string | null }>;

interface ProductFeedSectionProps {
  section: DiscoverySection;
  qtyMap: CartQtyMap;
  onAddToCart: (product: Product, variantId?: string) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  favoriteIds?: Set<string>;
  recommendationContext?: RecommendationTrackingContext;
}

export function ProductFeedSection({
  section,
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  favoriteIds,
  recommendationContext,
}: ProductFeedSectionProps) {
  const productIdsKey = getSectionProductIdsKey(section);

  useEffect(() => {
    if (!recommendationContext || section.products.length === 0) return;
    recordCustomerEvent({
      type: 'RECOMMENDATION_SHOWN',
      metadata: {
        sectionType: recommendationContext.sectionType,
        productIds: section.products.slice(0, 8).map((p) => p.id),
      },
      source: 'discovery',
    });
  }, [recommendationContext, productIdsKey, section.products.length]);

  if (section.products.length === 0) return null;

  const trackRecommendationClick = (product: Product) => {
    if (!recommendationContext) return;
    recordCustomerEvent({
      type: 'RECOMMENDATION_CLICKED',
      productId: product.id,
      categoryId: product.categoryId,
      metadata: { sectionType: recommendationContext.sectionType },
      source: 'discovery',
    });
  };

  const trackRecommendationAdd = (product: Product, variantId?: string) => {
    if (recommendationContext) {
      recordCustomerEvent({
        type: 'RECOMMENDATION_ADDED_TO_CART',
        productId: product.id,
        categoryId: product.categoryId,
        metadata: { sectionType: recommendationContext.sectionType },
        source: 'discovery',
      });
    }
    onAddToCart(product, variantId);
  };

  const handleAddToCart = recommendationContext ? trackRecommendationAdd : onAddToCart;
  const handleProductNavigate = recommendationContext ? trackRecommendationClick : undefined;

  return (
    <section className="mb-8 md:mb-10">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-bold text-gray-900 leading-snug">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">{section.subtitle}</p>
          )}
        </div>
        {section.viewAllHref && (
          <Link
            href={section.viewAllHref}
            className="shrink-0 inline-flex items-center gap-0.5 text-xs md:text-sm font-semibold text-primary-600 hover:text-primary-700 min-h-[32px]"
          >
            عرض الكل
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </Link>
        )}
      </div>

      {/* Mobile: horizontal snap scroll with full-width cards */}
      <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-4 w-max pb-1">
          {section.products.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[calc(100vw-2rem)] max-w-[420px]"
            >
              <ProductCard
                product={product}
                qtyMap={qtyMap}
                onAddToCart={handleAddToCart}
                onQuantityAdjust={onQuantityAdjust}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favoriteIds?.has(product.id)}
                onProductNavigate={handleProductNavigate}
                layout="feed"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: compact grid */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
        {section.products.slice(0, 4).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            qtyMap={qtyMap}
            onAddToCart={handleAddToCart}
            onQuantityAdjust={onQuantityAdjust}
            onToggleFavorite={onToggleFavorite}
            isFavorite={favoriteIds?.has(product.id)}
            onProductNavigate={handleProductNavigate}
            layout="grid"
          />
        ))}
      </div>
    </section>
  );
}

interface ProductFeedSectionSkeletonProps {
  className?: string;
}

export function ProductFeedSectionSkeleton({ className }: ProductFeedSectionSkeletonProps) {
  return (
    <div className={cn('mb-8 space-y-3', className)}>
      <div className="skeleton h-6 w-40 rounded-lg" />
      <div className="skeleton h-[320px] w-full rounded-2xl md:h-64" />
    </div>
  );
}
