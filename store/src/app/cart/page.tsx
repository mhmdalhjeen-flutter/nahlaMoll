'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { CartHeader } from '@/components/cart/CartHeader';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { CartPageSkeleton } from '@/components/cart/CartPageSkeleton';
import { CartSummary } from '@/components/cart/CartSummary';
import { FreeDeliveryProgress } from '@/components/cart/FreeDeliveryProgress';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useCartMap, useCartActions } from '@/hooks/useCartMap';
import { useValidatedDeliveryArea } from '@/hooks/useValidatedDeliveryArea';
import { storeApi } from '@/lib/store-api';
import type { CartItem } from '@/lib/types';
import {
  formatCartHeaderCounts,
  isCartItemInvalid,
} from '@/lib/cart-item-utils';
import { useToastStore } from '@/stores/toast-store';
import { StoreClosedAlert } from '@/components/store/StoreStatus';
import { cn } from '@/lib/utils';

export default function CartPage() {
  return (
    <AuthGuard>
      <CartContent />
    </AuthGuard>
  );
}

function CartContent() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, summary, cartQueryKey } = useCartMap();
  const { deliveryAreaId } = useValidatedDeliveryArea();
  const { adjustQuantity, setQuantity, add } = useCartActions();
  const toast = useToastStore((s) => s.show);

  if (isLoading) {
    return <CartPageSkeleton />;
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <ErrorState
          message="تعذر تحميل السلة. حاول مرة أخرى."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <EmptyState
          title="🚚 التوصيل علينا لما تكمل 100%"
          description="سلتك فارغة حاليًا — تصفّح المنتجات وأضف ما يناسبك."
          action={
            <Link href="/">
              <Button className="btn-cta min-h-[48px]">ابدأ التسوق</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasInvalidItems = items.some(isCartItemInvalid);

  const handleRemove = (item: CartItem) => {
    const snapshot = {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: item.product,
      variant: item.variant,
    };

    setQuantity(item.id, 0);

    toast('تم حذف المنتج', 'info', {
      label: 'تراجع',
      onClick: () => {
        void add(
          snapshot.productId,
          snapshot.quantity,
          snapshot.variantId ?? undefined,
          snapshot.product,
          snapshot.variant ?? undefined,
          { silent: true },
        );
      },
    });
  };

  const handleClearAll = async () => {
    try {
      await storeApi.clearCart();
      await qc.invalidateQueries({ queryKey: [...cartQueryKey] });
      toast('تم حذف جميع المنتجات', 'info');
    } catch {
      toast('تعذر حذف السلة', 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl pb-32">
      <CartHeader
        subtitle={formatCartHeaderCounts(items.length, totalPieces)}
        onClearAll={handleClearAll}
      />

      <StoreClosedAlert />

      {summary && (
        <FreeDeliveryProgress summary={summary} hideFeeDetails className="mb-4" />
      )}

      <div className="space-y-3 mb-5">
        {items.map((item) => (
          <CartLineItem
            key={item.id}
            item={item}
            onDecrease={() => adjustQuantity(item.id, -1)}
            onIncrease={() => adjustQuantity(item.id, 1)}
            onRemove={() => handleRemove(item)}
          />
        ))}
      </div>

      {summary && (
        <CartSummary
          summary={summary}
          deliveryAreaId={deliveryAreaId}
          className="mb-4"
        />
      )}

      {hasInvalidItems && (
        <p className="text-sm text-warning-700 mb-3" role="alert">
          يرجى مراجعة المنتجات غير المتوفرة قبل متابعة الطلب.
        </p>
      )}

      <div className="fixed bottom-[4.25rem] inset-x-0 z-30 md:static md:bottom-auto px-4 md:px-0 pb-3 md:pb-0 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent md:bg-none pt-3 md:pt-0">
        {hasInvalidItems ? (
          <Button
            className="w-full min-h-[48px] text-base shadow-lg md:shadow-none btn-cta"
            size="lg"
            disabled
          >
            متابعة الطلب
          </Button>
        ) : (
          <Link href="/checkout" className="block max-w-2xl mx-auto">
            <Button
              className={cn(
                'w-full min-h-[48px] text-base shadow-lg md:shadow-none btn-cta',
              )}
              size="lg"
            >
              متابعة الطلب
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
