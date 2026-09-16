'use client';

import { Truck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { CheckoutSection } from './CheckoutSection';

interface CheckoutDeliverySummaryProps {
  deliveryFee: number | null;
  isFreeDelivery: boolean;
  hasDeliveryArea: boolean;
  step?: number;
  className?: string;
}

function getDeliveryLabel(
  deliveryFee: number | null,
  isFreeDelivery: boolean,
  hasDeliveryArea: boolean,
): string {
  if (!hasDeliveryArea) {
    return 'يتم تحديده عند تأكيد العنوان';
  }
  if (isFreeDelivery) {
    return 'مجاني';
  }
  return `${formatPrice(deliveryFee ?? 0)} ₪`;
}

export function CheckoutDeliverySummary({
  deliveryFee,
  isFreeDelivery,
  hasDeliveryArea,
  step = 3,
  className,
}: CheckoutDeliverySummaryProps) {
  const label = getDeliveryLabel(deliveryFee, isFreeDelivery, hasDeliveryArea);

  return (
    <CheckoutSection title="التوصيل" step={step} className={className} id="checkout-delivery">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Truck className="w-4 h-4 shrink-0" aria-hidden />
          <span className="text-sm">رسوم التوصيل</span>
        </div>
        <span
          className={
            isFreeDelivery && hasDeliveryArea
              ? 'text-sm font-semibold text-success-600'
              : 'text-sm font-medium text-gray-900 tabular-nums'
          }
        >
          {label}
        </span>
      </div>
    </CheckoutSection>
  );
}
