'use client';

import type { CartItem } from '@/lib/types';
import { calculateUnitPrice } from '@/lib/product-meta';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CheckoutInvoiceProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  isFreeDelivery: boolean;
  className?: string;
}

export function CheckoutInvoice({
  items,
  subtotal,
  deliveryFee,
  total,
  isFreeDelivery,
  className,
}: CheckoutInvoiceProps) {
  return (
    <section className={cn('card p-0 overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <h2 className="font-bold text-gray-900">الفاتورة</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const variantAdjustment = item.variant
            ? parseFloat(String(item.variant.priceAdjustment))
            : 0;
          const { unitPrice } = calculateUnitPrice(item.product, variantAdjustment);
          const lineTotal = unitPrice * item.quantity;

          return (
            <div key={item.id} className="px-4 py-3 flex justify-between gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 line-clamp-2">{item.product.name}</p>
                {item.variant && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.variant.name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {item.quantity} × {formatPrice(unitPrice)} ₪
                </p>
              </div>
              <p className="font-semibold text-gray-900 shrink-0 tabular-nums">
                {formatPrice(lineTotal)} ₪
              </p>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-4 space-y-2.5 text-sm border-t border-gray-100 bg-white">
        <div className="flex justify-between">
          <span className="text-gray-600">المجموع الفرعي</span>
          <span className="font-medium tabular-nums">{formatPrice(subtotal)} ₪</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">رسوم التوصيل</span>
          {deliveryFee == null ? (
            <span className="text-gray-400 text-sm">اختر المنطقة</span>
          ) : isFreeDelivery ? (
            <span className="font-semibold text-success-600">التوصيل مجاني 🎉</span>
          ) : (
            <span className="font-medium tabular-nums">{formatPrice(deliveryFee)} ₪</span>
          )}
        </div>
        <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
          <span className="font-bold text-gray-900">المجموع الكلي</span>
          <span className="font-bold text-lg text-primary-700 tabular-nums">
            {formatPrice(total)} ₪
          </span>
        </div>
      </div>
    </section>
  );
}
