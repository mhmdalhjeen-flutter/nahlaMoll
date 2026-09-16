'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CartItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-url';
import { getCartLinePricing, isCartItemInvalid } from '@/lib/cart-item-utils';
import { getProductUnavailableLabel, isProductPurchasable, OUT_OF_STOCK_LABEL } from '@/lib/free-delivery';
import { cn } from '@/lib/utils';
import { CheckoutSection } from './CheckoutSection';

interface CheckoutProductsReviewProps {
  items: CartItem[];
  step?: number;
  className?: string;
}

export function CheckoutProductsReview({ items, step = 2, className }: CheckoutProductsReviewProps) {
  const hasInvalidItems = items.some(isCartItemInvalid);

  return (
    <CheckoutSection title="منتجات الطلب" step={step} className={className} id="checkout-products">
      {hasInvalidItems && (
        <p className="text-sm text-warning-700 bg-warning-50 border border-warning-100 rounded-xl px-3 py-2 mb-3" role="alert">
          يوجد منتج يحتاج إلى مراجعة قبل تأكيد الطلب.
        </p>
      )}

      <ul className="divide-y divide-gray-100">
        {items.map((item) => {
          const invalid = isCartItemInvalid(item);
          const { unitPrice, lineTotal } = getCartLinePricing(item);
          const unavailableLabel = !isProductPurchasable(item.product, item.variant)
            ? getProductUnavailableLabel(item.product, item.variant)
            : OUT_OF_STOCK_LABEL;

          return (
            <li
              key={item.id}
              className={cn(
                'flex gap-3 py-3 first:pt-0 last:pb-0',
                invalid && 'opacity-90',
              )}
            >
              <div className="relative w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {item.product.images?.[0] ? (
                  <Image
                    src={getOptimizedImageUrl(item.product.images[0], 'thumbnail')}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">
                    —
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.product.name}</p>
                {item.variant && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.variant.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5 tabular-nums">× {item.quantity}</p>
                {invalid && (
                  <p className="text-xs font-medium text-warning-700 mt-1">{unavailableLabel}</p>
                )}
              </div>

              <p className="text-sm font-semibold text-gray-900 tabular-nums shrink-0 self-start">
                {formatPrice(lineTotal)} ₪
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <Link
          href="/cart"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 min-h-[44px] inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg px-1"
        >
          تعديل السلة
        </Link>
      </div>
    </CheckoutSection>
  );
}
