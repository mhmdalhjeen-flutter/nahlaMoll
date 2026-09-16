'use client';

import { Star } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn, formatPrice } from '@/lib/utils';
import { calculateUnitPrice, parseProductTags } from '@/lib/product-meta';

interface ProductPriceDisplayProps {
  product: Product;
  variantAdjustment?: number;
  size?: 'sm' | 'md' | 'lg';
  showUnit?: boolean;
  showRecommended?: boolean;
  showBadges?: boolean;
  /** Card layout: gray strikethrough, restrained discount badge, no red tones. */
  layout?: 'default' | 'card' | 'detail';
  className?: string;
}

function formatUnitLabel(unit: string): string {
  const trimmed = unit.trim();
  if (trimmed.startsWith('لل')) return trimmed;
  return `لل${trimmed}`;
}

export function ProductPriceDisplay({
  product,
  variantAdjustment = 0,
  size = 'sm',
  showUnit = true,
  showRecommended = false,
  showBadges = true,
  layout = 'default',
  className,
}: ProductPriceDisplayProps) {
  const { unit } = parseProductTags(product.tags ?? []);
  const pricing = calculateUnitPrice(product, variantAdjustment);
  const unitLabel = formatUnitLabel(unit);
  const isCardLayout = layout === 'card';
  const isDetailLayout = layout === 'detail';

  const finalPriceClass = isDetailLayout
    ? 'text-3xl md:text-2xl font-bold'
    : isCardLayout
      ? 'text-lg md:text-base font-bold'
      : {
          sm: 'text-base',
          md: 'text-xl',
          lg: 'text-2xl',
        }[size];

  const originalPriceClass = isCardLayout || isDetailLayout
    ? 'text-base text-gray-400 font-normal'
    : {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      }[size];

  const unitClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  const showStrikethrough =
    pricing.isOfferActive && pricing.hasDiscount && pricing.unitPrice < pricing.originalUnitPrice;

  return (
    <div className={cn('space-y-1', className)}>
      {showBadges && showRecommended && product.isRecommended && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning-700 bg-warning-50 border border-warning-100 px-2 py-0.5 rounded-lg">
          <Star className="w-3 h-3 fill-warning-500 text-warning-500" />
          موصى به
        </span>
      )}

      {showBadges && !isCardLayout && !isDetailLayout && showStrikethrough && pricing.discountLabel && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center text-[10px] font-bold text-error-700 bg-error-50 border border-error-100 px-2 py-0.5 rounded-lg">
            عرض
          </span>
          <span className="text-[11px] font-medium text-error-600">{pricing.discountLabel}</span>
        </div>
      )}

      <p
        className={cn(
          'flex flex-wrap items-baseline gap-x-2 leading-snug',
          isCardLayout ? 'gap-y-0.5' : unitClass,
        )}
      >
        {showStrikethrough && (
          <span
            className={cn(
              'line-through decoration-gray-300 tabular-nums',
              isCardLayout || isDetailLayout
                ? originalPriceClass
                : 'font-medium text-error-500 decoration-error-500 decoration-2',
              !(isCardLayout || isDetailLayout) && originalPriceClass,
            )}
          >
            {formatPrice(pricing.originalUnitPrice)} ₪
          </span>
        )}
        <span className={cn('text-gray-900 tabular-nums', finalPriceClass)}>
          {formatPrice(pricing.unitPrice)} ₪
        </span>
        {showUnit && !isCardLayout && (
          <span className="text-gray-500 font-normal">/ {unitLabel}</span>
        )}
      </p>

      {showBadges && (isCardLayout || isDetailLayout) && showStrikethrough && pricing.discountLabel && (
        <span className="inline-flex text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
          {pricing.discountLabel}
        </span>
      )}
    </div>
  );
}
