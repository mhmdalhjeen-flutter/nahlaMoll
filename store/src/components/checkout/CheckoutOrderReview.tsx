'use client';

import { formatPrice } from '@/lib/utils';
import { CheckoutSection } from './CheckoutSection';

interface CheckoutOrderReviewProps {
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  isFreeDelivery: boolean;
  hasDeliveryArea: boolean;
  step?: number;
  className?: string;
}

export function CheckoutOrderReview({
  subtotal,
  deliveryFee,
  total,
  isFreeDelivery,
  hasDeliveryArea,
  step = 5,
  className,
}: CheckoutOrderReviewProps) {
  const deliveryLabel = !hasDeliveryArea
    ? 'يتم تحديده عند تأكيد العنوان'
    : isFreeDelivery
      ? 'مجاني'
      : `${formatPrice(deliveryFee ?? 0)} ₪`;

  return (
    <CheckoutSection title="مراجعة الطلب" step={step} className={className} id="checkout-review">
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between items-center gap-4">
          <dt className="text-gray-600">المنتجات</dt>
          <dd className="font-medium text-gray-900 tabular-nums">{formatPrice(subtotal)} ₪</dd>
        </div>
        <div className="flex justify-between items-center gap-4">
          <dt className="text-gray-600">التوصيل</dt>
          <dd
            className={
              isFreeDelivery && hasDeliveryArea
                ? 'font-medium text-success-600'
                : 'font-medium text-gray-900 tabular-nums'
            }
          >
            {deliveryLabel}
          </dd>
        </div>
        <div className="flex justify-between items-center gap-4 pt-2.5 border-t border-gray-100">
          <dt className="font-bold text-gray-900">الإجمالي</dt>
          <dd className="font-bold text-lg text-gray-900 tabular-nums">{formatPrice(total)} ₪</dd>
        </div>
      </dl>
    </CheckoutSection>
  );
}
