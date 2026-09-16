'use client';

import type { Order } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import {
  formatOrderDateTime,
  getOrderItemCount,
  isOrderFreeDelivery,
} from '@/lib/customer-order-ui';

interface OrderProductsSectionProps {
  order: Order;
  className?: string;
}

export function OrderProductsSection({ order, className }: OrderProductsSectionProps) {
  return (
    <section className={className}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <h2 className="font-bold text-gray-900">المنتجات</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {order.items.map((item) => {
          let variantLabel: string | null = null;
          if (item.variantInfo) {
            try {
              variantLabel = JSON.parse(item.variantInfo).name;
            } catch {
              /* ignore */
            }
          }
          const lineTotal = Number(item.price) * item.quantity;
          return (
            <div key={item.id} className="px-4 py-4 flex justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{item.productName}</p>
                {variantLabel && (
                  <p className="text-xs text-gray-500 mt-0.5">{variantLabel}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {item.quantity} × {formatPrice(item.price)} ₪
                </p>
              </div>
              <p className="font-bold tabular-nums shrink-0">{formatPrice(lineTotal)} ₪</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface OrderInvoiceSectionProps {
  order: Order;
  className?: string;
}

export function OrderInvoiceSection({ order, className }: OrderInvoiceSectionProps) {
  const freeDelivery = isOrderFreeDelivery(order);
  const itemCount = getOrderItemCount(order);

  return (
    <section className={className}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <h2 className="font-bold text-gray-900">الفاتورة</h2>
      </div>
      <div className="px-4 py-4 space-y-3 text-sm">
        <div className="flex justify-between gap-3 pb-3 border-b border-gray-100">
          <span className="text-gray-500">رقم الطلب</span>
          <span className="font-bold text-gray-900 tabular-nums">
            {formatCustomerOrderNumber(order.orderNumber)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">التاريخ</span>
          <span className="font-medium text-gray-800">{formatOrderDateTime(order.createdAt)}</span>
        </div>
        <div className="flex justify-between gap-3 text-xs text-gray-500">
          <span>{itemCount} {itemCount === 1 ? 'منتج' : 'منتجات'}</span>
        </div>

        <div className="pt-2 space-y-2.5 border-t border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-600">المجموع الفرعي</span>
            <span className="font-medium tabular-nums">{formatPrice(order.subtotal)} ₪</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">التوصيل</span>
            {freeDelivery ? (
              <span className="font-semibold text-success-600">🚚 مجاني</span>
            ) : (
              <span className="font-medium tabular-nums">{formatPrice(order.deliveryFee)} ₪</span>
            )}
          </div>
          {freeDelivery && (
            <p className="text-xs text-success-700 bg-success-50 rounded-lg px-3 py-2">
              🚚 التوصيل مجاني
            </p>
          )}
          <div className="flex justify-between items-center pt-2.5 border-t border-gray-200">
            <span className="font-bold text-gray-900">الإجمالي</span>
            <span className="font-bold text-xl text-primary-700 tabular-nums">
              {formatPrice(order.total)} ₪
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
