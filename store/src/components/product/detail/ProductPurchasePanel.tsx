'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import type { Product, ProductVariant, FreeDeliverySummary } from '@/lib/types';
import { CartQuantityStepper } from '@/components/cart/CartQuantityStepper';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { FreeDeliveryProgress } from '@/components/cart/FreeDeliveryProgress';
import { cn } from '@/lib/utils';
import {
  getProductUnavailableLabel,
  isProductInStock,
  isProductPurchasable,
} from '@/lib/free-delivery';
import { cartItemKey } from '@/hooks/useCartMap';
import { canProductCompleteFreeDelivery } from '@/lib/product-detail-free-delivery';
import { useToastStore } from '@/stores/toast-store';

interface ProductPurchasePanelProps {
  product: Product;
  variant: ProductVariant | null;
  qtyMap?: Map<string, { itemId: string; quantity: number; variantId?: string | null }>;
  cartSummary?: FreeDeliverySummary | null;
  onAdd: (quantity: number) => void;
  onQuantityAdjust: (itemId: string, delta: number) => void;
}

export function getMaxPurchaseQuantity(
  product: Product,
  variant: ProductVariant | null,
): number | undefined {
  if (product.availability === 'UNLIMITED') return undefined;
  if (variant) return Math.max(0, variant.stock);
  const variants = product.variants ?? [];
  if (variants.length > 0) return undefined;
  return Math.max(0, product.stock);
}

export function ProductPurchasePanel({
  product,
  variant,
  qtyMap,
  cartSummary,
  onAdd,
  onQuantityAdjust,
}: ProductPurchasePanelProps) {
  const toast = useToastStore((s) => s.show);
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const canBuy = isProductPurchasable(product, variant);
  const unavailableLabel = getProductUnavailableLabel(product, variant);
  const maxQty = getMaxPurchaseQuantity(product, variant);

  const cartEntry = useMemo(() => {
    if (!qtyMap) return undefined;
    if (hasVariants) {
      if (variant) return qtyMap.get(cartItemKey(product.id, variant.id));
      return undefined;
    }
    return qtyMap.get(cartItemKey(product.id));
  }, [qtyMap, hasVariants, variant, product.id]);

  const inCart = !!cartEntry && cartEntry.quantity > 0;
  const [localQty, setLocalQty] = useState(1);
  const [addFeedback, setAddFeedback] = useState(false);

  useEffect(() => {
    if (inCart) setAddFeedback(false);
  }, [inCart]);

  useEffect(() => {
    if (!addFeedback) return undefined;
    const t = window.setTimeout(() => setAddFeedback(false), 1200);
    return () => window.clearTimeout(t);
  }, [addFeedback]);

  useEffect(() => {
    setLocalQty((q) => {
      const cap = maxQty != null && maxQty > 0 ? maxQty : q;
      if (maxQty === 0) return 1;
      return Math.min(Math.max(1, q), cap);
    });
  }, [variant?.id, maxQty]);

  const showCompleteMessage = canProductCompleteFreeDelivery({
    freeDeliveryValue: product.freeDeliveryValue,
    quantity: localQty,
    cartSummary,
  });

  const needsVariant = hasVariants && !variant;
  const showCartProgress =
    cartSummary && (cartSummary.itemCount ?? cartSummary.totalItems ?? 0) > 0;

  const handleAdd = () => {
    if (needsVariant) {
      toast('اختر الخيار أولاً', 'info');
      return;
    }
    if (!canBuy) return;
    onAdd(localQty);
    setAddFeedback(true);
  };

  const decreaseLocal = () => setLocalQty((q) => Math.max(1, q - 1));
  const increaseLocal = () => {
    if (!isProductInStock(product, variant)) return;
    setLocalQty((q) => {
      if (maxQty != null) return Math.min(maxQty, q + 1);
      return q + 1;
    });
  };

  const handleCartIncrease = () => {
    if (!cartEntry) return;
    if (maxQty != null && cartEntry.quantity >= maxQty) return;
    onQuantityAdjust(cartEntry.itemId, 1);
  };

  return (
    <div className="space-y-4">
      {showCompleteMessage && (
        <p className="text-sm font-medium text-success-700 bg-success-50 border border-success-100 rounded-xl px-3 py-2.5">
          🎉 هذا المنتج ممكن يكملك التوصيل المجاني!
        </p>
      )}

      {!inCart && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900">الكمية</p>
          <QuantityStepper
            quantity={localQty}
            onDecrease={decreaseLocal}
            onIncrease={increaseLocal}
            min={1}
            max={maxQty}
          />
        </div>
      )}

      <div id="product-purchase-cta">
        {inCart && cartEntry ? (
          <CartQuantityStepper
            quantity={cartEntry.quantity}
            onDecrease={() => onQuantityAdjust(cartEntry.itemId, -1)}
            onIncrease={handleCartIncrease}
            max={maxQty}
            variant="card"
          />
        ) : addFeedback ? (
          <button
            type="button"
            disabled
            aria-live="polite"
            className={cn(
              'w-full min-h-12 rounded-xl text-sm font-semibold touch-manipulation',
              'inline-flex items-center justify-center gap-2',
              'bg-success-50 text-success-600 border border-success-100',
            )}
          >
            <Check className="w-4 h-4" aria-hidden />
            تمت الإضافة
          </button>
        ) : canBuy ? (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`أضف ${product.name} إلى السلة`}
            className={cn(
              'w-full min-h-12 md:min-h-11 rounded-xl btn-cta text-sm font-semibold',
              'active:scale-[0.98] motion-reduce:transform-none transition-transform touch-manipulation',
              'inline-flex items-center justify-center gap-2',
            )}
          >
            <ShoppingCart className="w-4 h-4" aria-hidden />
            أضف للسلة
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full min-h-12 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium cursor-not-allowed"
          >
            {unavailableLabel}
          </button>
        )}
      </div>

      {showCartProgress && cartSummary && (
        <FreeDeliveryProgress summary={cartSummary} compact={false} hideFeeDetails className="mt-2" />
      )}
    </div>
  );
}
