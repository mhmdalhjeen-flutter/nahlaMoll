'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Heart, ShoppingCart, Star } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { cartItemKey } from '@/hooks/useCartMap';
import { CartQuantityStepper } from '@/components/cart/CartQuantityStepper';
import { VariantPickerModal } from './VariantPickerModal';
import { ProductPriceDisplay } from './ProductPriceDisplay';
import { FreeDeliveryBadge } from './FreeDeliveryBadge';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { parseProductTags } from '@/lib/product-meta';
import { isProductPurchasable, getProductUnavailableLabel } from '@/lib/free-delivery';

interface ProductCardProps {
  product: Product;
  qtyMap?: Map<string, { itemId: string; quantity: number; variantId?: string | null }>;
  onAddToCart?: (product: Product, variantId?: string) => void;
  onQuantityAdjust?: (itemId: string, delta: number) => void;
  onToggleFavorite?: (product: Product) => void;
  isFavorite?: boolean;
  showAddButton?: boolean;
  layout?: 'feed' | 'grid' | 'list' | 'row';
  /** When provided with reviewCount > 0, shows star rating on the card. */
  averageRating?: number;
  reviewCount?: number;
  /** Optional hook when the customer opens the product from the card link. */
  onProductNavigate?: (product: Product) => void;
}

const ADD_FEEDBACK_MS = 1200;

export function ProductCard({
  product,
  qtyMap,
  onAddToCart,
  onQuantityAdjust,
  onToggleFavorite,
  isFavorite,
  showAddButton = true,
  layout = 'list',
  averageRating,
  reviewCount,
  onProductNavigate,
}: ProductCardProps) {
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [addFeedback, setAddFeedback] = useState(false);

  const image = product.images?.[0];
  const { animatedImage } = parseProductTags(product.tags ?? []);
  const displayImage = animatedImage ?? image;
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const canPurchase = isProductPurchasable(product);
  const unavailableLabel = getProductUnavailableLabel(product);
  const isFeedLayout = layout === 'feed';
  const isRowLayout = layout === 'row';
  const isGridLayout = layout === 'list' || layout === 'grid';
  const showFavorite = !!onToggleFavorite;
  const showRating = typeof reviewCount === 'number' && reviewCount > 0 && typeof averageRating === 'number';

  const cartEntry = useMemo(() => {
    if (!qtyMap) return undefined;

    if (hasVariants) {
      if (activeVariantId) {
        return qtyMap.get(cartItemKey(product.id, activeVariantId));
      }
      return Array.from(qtyMap.entries()).find(
        ([key]) => key.startsWith(`${product.id}:`) && key !== `${product.id}:`,
      )?.[1];
    }

    return qtyMap.get(cartItemKey(product.id));
  }, [qtyMap, hasVariants, activeVariantId, product.id]);

  const inCart = !!cartEntry && cartEntry.quantity > 0;

  useEffect(() => {
    if (inCart) setAddFeedback(false);
  }, [inCart]);

  useEffect(() => {
    if (!addFeedback) return undefined;
    const timer = window.setTimeout(() => setAddFeedback(false), ADD_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [addFeedback]);

  const stopNav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAddClick = (e: React.MouseEvent) => {
    stopNav(e);
    if (hasVariants) {
      setVariantModalOpen(true);
      return;
    }
    onAddToCart?.(product);
    setAddFeedback(true);
  };

  const handleVariantConfirm = (variant: { id: string }) => {
    setActiveVariantId(variant.id);
    onAddToCart?.(product, variant.id);
    setVariantModalOpen(false);
    setAddFeedback(true);
  };

  const handleQuantityAdjust = (delta: number) => {
    if (!cartEntry || !onQuantityAdjust) return;
    onQuantityAdjust(cartEntry.itemId, delta);
  };

  return (
    <>
      <article
        className={cn(
          'relative bg-white rounded-2xl border border-slate-200/90 overflow-hidden',
          'shadow-card hover:shadow-card-hover transition-shadow duration-200',
          isRowLayout
            ? 'flex flex-row items-stretch gap-2.5 p-2.5 h-auto w-full'
            : 'flex flex-col h-full',
          isFeedLayout ? 'p-2.5 md:p-3' : !isRowLayout && 'p-2 md:p-3',
        )}
      >
        {/* Image area */}
        <div
          className={cn(
            'relative bg-gray-50 rounded-xl overflow-hidden shrink-0',
            isRowLayout ? 'w-[88px] sm:w-[100px] aspect-square' : 'aspect-square w-full',
          )}
        >
          {!imageLoaded && displayImage && (
            <div className="absolute inset-0 skeleton motion-reduce:animate-none" aria-hidden />
          )}
          {displayImage ? (
            <OptimizedImage
              src={displayImage}
              alt={product.name}
              variant="card"
              fill
              className={cn(
                'object-contain p-2 transition-opacity duration-300 motion-reduce:transition-none',
                imageLoaded ? 'opacity-100' : 'opacity-0',
              )}
              sizes={
                isFeedLayout
                  ? '100vw'
                  : isRowLayout
                    ? '100px'
                    : isGridLayout
                      ? '(max-width:768px) 50vw, 25vw'
                      : '(max-width:768px) 100vw, 25vw'
              }
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
              بدون صورة
            </div>
          )}

          {product.isRecommended && (
            <span
              className={cn(
                'absolute top-2 right-2 z-[2] inline-flex items-center rounded-full',
                'bg-primary-50/95 text-primary-700 border border-primary-100',
                'font-semibold leading-none backdrop-blur-[2px]',
                isGridLayout ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1',
              )}
            >
              ✨ موصى به
            </span>
          )}

          {showFavorite && (
            <button
              type="button"
              aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              aria-pressed={isFavorite}
              onClick={(e) => {
                stopNav(e);
                onToggleFavorite?.(product);
              }}
              className={cn(
                'absolute top-2 left-2 z-[2] rounded-full',
                'bg-white/90 backdrop-blur-sm border border-gray-100',
                'flex items-center justify-center transition-colors touch-manipulation',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                isFavorite ? 'text-error-500' : 'text-gray-500 hover:text-error-500',
                isGridLayout ? 'min-w-9 min-h-9 w-9 h-9' : 'min-w-11 min-h-11 w-11 h-11',
              )}
            >
              <Heart
                className={cn(
                  isGridLayout ? 'w-4 h-4' : 'w-[18px] h-[18px]',
                  isFavorite && 'fill-current',
                )}
                aria-hidden
              />
            </button>
          )}
        </div>

        {/* Product info — no z-index so stretched link receives clicks on name/price area */}
        <div
          className={cn(
            'flex flex-col flex-1 min-w-0',
            isRowLayout ? 'gap-1.5 py-0.5 justify-between' : 'gap-1.5',
            isGridLayout ? 'pt-1.5 md:pt-2' : !isRowLayout && 'pt-1.5 md:pt-2',
          )}
        >
          <div
            className={cn(
              'flex items-start justify-between gap-1.5',
              isRowLayout ? 'min-h-0' : 'min-h-[1.75rem] md:min-h-[1.125rem]',
            )}
          >
            <h3
              className={cn(
                'flex-1 min-w-0 font-medium text-gray-900 leading-snug',
                isRowLayout
                  ? 'text-sm line-clamp-2'
                  : isGridLayout
                    ? 'text-[13px] line-clamp-2 md:text-sm md:truncate'
                    : 'text-[15px] md:text-sm truncate',
              )}
              title={product.name}
            >
              {product.name}
            </h3>
            {showRating && (
              <span
                className="shrink-0 inline-flex items-center gap-0.5 text-xs text-gray-500 tabular-nums"
                aria-label={`التقييم ${averageRating!.toFixed(1)} من 5`}
              >
                <Star className="w-3.5 h-3.5 fill-warning-500 text-warning-500" aria-hidden />
                {averageRating!.toFixed(1)}
              </span>
            )}
          </div>

          <ProductPriceDisplay
            product={product}
            layout="card"
            showRecommended={false}
            showUnit={false}
          />

          {product.recommendationReason ? (
            <p className="text-[11px] md:text-xs text-primary-700/90 leading-snug line-clamp-2">
              {product.recommendationReason}
            </p>
          ) : null}

          <FreeDeliveryBadge
            freeDeliveryValue={product.freeDeliveryValue}
            showZeroContribution
            className="mt-0"
          />

          {showAddButton && canPurchase && (
            <div className={cn('relative z-[2]', isRowLayout ? 'pt-0' : 'pt-0.5 mt-auto')}>
              {inCart && cartEntry && onQuantityAdjust ? (
                <CartQuantityStepper
                  quantity={cartEntry.quantity}
                  onDecrease={() => handleQuantityAdjust(-1)}
                  onIncrease={() => handleQuantityAdjust(1)}
                />
              ) : addFeedback ? (
                <button
                  type="button"
                  disabled
                  aria-live="polite"
                  className={cn(
                    'w-full min-h-11 rounded-xl text-sm font-semibold touch-manipulation',
                    'inline-flex items-center justify-center gap-2',
                    'bg-success-50 text-success-600 border border-success-100',
                  )}
                >
                  <Check className="w-4 h-4" aria-hidden />
                  تمت الإضافة
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddClick}
                  aria-label={`أضف ${product.name} إلى السلة`}
                  className={cn(
                    'w-full rounded-xl btn-cta font-semibold',
                    'active:scale-[0.98] motion-reduce:transform-none transition-transform touch-manipulation',
                    'inline-flex items-center justify-center gap-2',
                    isGridLayout ? 'min-h-10 text-xs' : 'min-h-11 text-sm',
                  )}
                >
                  <ShoppingCart className="w-4 h-4" aria-hidden />
                  أضف للسلة
                </button>
              )}
            </div>
          )}

          {!canPurchase && (
            <p className="text-sm text-gray-500 text-center py-2 mt-auto" role="status">
              {unavailableLabel}
            </p>
          )}
        </div>

        {/* Stretched link — entire card navigates except z-[2] interactive controls */}
        <Link
          href={`/products/${product.id}`}
          className={cn(
            'absolute inset-0 z-[1] rounded-2xl',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          )}
          aria-label={`عرض ${product.name}`}
          onClick={() => onProductNavigate?.(product)}
        />
      </article>

      <VariantPickerModal
        open={variantModalOpen}
        product={product}
        onClose={() => setVariantModalOpen(false)}
        onConfirm={handleVariantConfirm}
      />
    </>
  );
}
