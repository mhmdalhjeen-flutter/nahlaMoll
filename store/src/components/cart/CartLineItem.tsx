'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import type { CartItem } from '@/lib/types';
import { cn, formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-url';
import { ProductPriceDisplay } from '@/components/product/ProductPriceDisplay';
import { CartQuantityStepper } from '@/components/cart/CartQuantityStepper';
import {
  getCartItemContributionLabel,
  getCartItemMaxStock,
  getCartLinePricing,
  isCartItemInvalid,
} from '@/lib/cart-item-utils';
import {
  getProductUnavailableLabel,
  isProductPurchasable,
  OUT_OF_STOCK_LABEL,
} from '@/lib/free-delivery';

interface CartLineItemProps {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

export function CartLineItem({ item, onDecrease, onIncrease, onRemove }: CartLineItemProps) {
  const invalid = isCartItemInvalid(item);
  const maxStock = getCartItemMaxStock(item.product, item.variant);
  const { unitPrice, lineTotal, variantAdjustment } = getCartLinePricing(item);
  const contributionLabel = getCartItemContributionLabel(item);
  const unavailableLabel = !isProductPurchasable(item.product, item.variant)
    ? getProductUnavailableLabel(item.product, item.variant)
    : OUT_OF_STOCK_LABEL;

  return (
    <article
      className={cn(
        'card p-3 flex gap-3',
        invalid && 'border-warning-200 bg-warning-50/30',
      )}
    >
      <Link
        href={`/products/${item.product.id}`}
        className="relative w-[88px] h-[88px] sm:w-24 sm:h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {item.product.images?.[0] ? (
          <Image
            src={getOptimizedImageUrl(item.product.images[0], 'thumbnail')}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            بدون صورة
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/products/${item.product.id}`}
              className="font-medium text-sm text-gray-900 line-clamp-2 hover:text-primary-600 leading-snug"
            >
              {item.product.name}
            </Link>
            {item.variant && (
              <p className="text-xs text-gray-500 mt-0.5">{item.variant.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={`حذف ${item.product.name}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {invalid && (
          <p className="text-xs font-medium text-warning-700" role="status">
            {unavailableLabel}
          </p>
        )}

        <ProductPriceDisplay
          product={item.product}
          variantAdjustment={variantAdjustment}
          size="sm"
          showBadges={false}
          showRecommended={false}
        />

        <p className="text-[11px] text-gray-500 leading-snug">{contributionLabel}</p>

        <div className="flex items-end justify-between gap-3 flex-wrap mt-auto pt-1">
          <CartQuantityStepper
            quantity={item.quantity}
            variant="inline"
            max={maxStock}
            onDecrease={onDecrease}
            onIncrease={onIncrease}
            disabled={invalid}
          />

          <div className="text-left shrink-0">
            <p className="text-[11px] text-gray-500 tabular-nums">
              {formatPrice(unitPrice)} ₪ × {item.quantity}
            </p>
            <p className="text-sm font-bold text-gray-900 tabular-nums">
              {formatPrice(lineTotal)} ₪
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
