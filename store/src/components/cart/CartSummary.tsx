'use client';

import type { FreeDeliverySummary } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface CartSummaryProps {
  summary: FreeDeliverySummary;
  deliveryAreaId: string | null;
  className?: string;
}

function getDeliveryLabel(
  summary: FreeDeliverySummary,
  deliveryAreaId: string | null,
): string {
  if (!deliveryAreaId) {
    return 'يتم تحديده عند متابعة الطلب';
  }
  if (summary.isFreeDelivery) {
    return 'مجاني';
  }
  return `${formatPrice(summary.deliveryFee)} ₪`;
}

function getOrderTotal(summary: FreeDeliverySummary, deliveryAreaId: string | null): number {
  const delivery = deliveryAreaId ? summary.deliveryFee : 0;
  return summary.subtotal + delivery;
}

export function CartSummary({ summary, deliveryAreaId, className }: CartSummaryProps) {
  const deliveryLabel = getDeliveryLabel(summary, deliveryAreaId);
  const total = getOrderTotal(summary, deliveryAreaId);

  return (
    <section className={className} aria-label="ملخص الطلب">
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">ملخص الطلب</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-600">المنتجات</span>
            <span className="font-medium text-gray-900 tabular-nums shrink-0">
              {formatPrice(summary.subtotal)} ₪
            </span>
          </div>

          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-600">التوصيل</span>
            <span
              className={
                summary.isFreeDelivery && deliveryAreaId
                  ? 'font-medium text-success-600 shrink-0'
                  : 'font-medium text-gray-900 shrink-0'
              }
            >
              {deliveryLabel}
            </span>
          </div>

          <div className="border-t border-gray-100 pt-2 flex justify-between items-center gap-4">
            <span className="font-bold text-gray-900">الإجمالي</span>
            <span className="font-bold text-lg text-gray-900 tabular-nums shrink-0">
              {formatPrice(total)} ₪
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
