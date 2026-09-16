'use client';

import Image from 'next/image';
import { computeDiscount, inferPaymentMethodLabel } from '@/lib/order-workflow';
import type { Order } from '@/lib/types';
import { formatPrice, PAYMENT_STATUS_AR } from '@/lib/utils';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import { OrderBadge, PaymentBadge } from '@/components/ui/StatusBadge';

interface OrderDetailsContentProps {
  order: Order;
  compactHeader?: boolean;
}

export function OrderDetailsContent({ order, compactHeader }: OrderDetailsContentProps) {
  const discount = computeDiscount(order);
  const created = new Date(order.createdAt).toLocaleString('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="space-y-5 min-w-0">
      {!compactHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">طلب</p>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight tabular-nums">
              {formatCustomerOrderNumber(order.orderNumber)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{created}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </div>
        </div>
      )}

      <section className="rounded-xl bg-gray-50 p-3 sm:p-4 space-y-2">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">الزبون</h4>
        <p className="font-semibold text-gray-900 break-words">{order.customer?.name ?? '—'}</p>
        <p className="text-sm text-gray-600 ltr-input break-all" dir="ltr">
          {order.customer?.phoneNumber ?? '—'}
        </p>
      </section>

      <section className="rounded-xl bg-gray-50 p-3 sm:p-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">العنوان</h4>
        <p className="text-sm text-gray-800 leading-relaxed break-words">{order.deliveryAddress}</p>
        {order.deliveryArea?.name && (
          <p className="text-xs text-gray-500 mt-2">منطقة: {order.deliveryArea.name}</p>
        )}
      </section>

      <InvoiceSection order={order} discount={discount} />
      <PaymentSection order={order} />
    </div>
  );
}

function InvoiceSection({ order, discount }: { order: Order; discount: number }) {
  return (
    <section>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">المنتجات</h4>
      <ul className="space-y-3">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between gap-3 text-sm rounded-xl bg-gray-50 p-3 min-w-0"
          >
            <div className="min-w-0 flex-1">
              <span className="font-medium text-gray-900 break-words">{item.productName}</span>
              <span className="text-gray-500"> × {item.quantity}</span>
              {item.variantInfo && (
                <p className="text-xs text-gray-400 mt-0.5 break-words">{item.variantInfo}</p>
              )}
            </div>
            <span className="font-medium text-gray-800 shrink-0 ltr-input" dir="ltr">
              {formatPrice(Number(item.price) * item.quantity)} ₪
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 pt-4 border-t border-dashed border-gray-200 space-y-2 text-sm">
        <div className="flex justify-between gap-3 text-gray-600">
          <span>المجموع الفرعي</span>
          <span className="ltr-input shrink-0" dir="ltr">{formatPrice(order.subtotal)} ₪</span>
        </div>
        <div className="flex justify-between gap-3 text-gray-600">
          <span>التوصيل</span>
          <span className="ltr-input shrink-0" dir="ltr">{formatPrice(order.deliveryFee)} ₪</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between gap-3 text-success-700">
            <span>الخصم</span>
            <span className="ltr-input shrink-0" dir="ltr">-{formatPrice(discount)} ₪</span>
          </div>
        )}
        <div className="flex justify-between gap-3 text-base font-bold text-gray-900 pt-2">
          <span>المجموع الكلي</span>
          <span className="text-primary-700 ltr-input shrink-0" dir="ltr">{formatPrice(order.total)} ₪</span>
        </div>
      </div>
    </section>
  );
}

function PaymentSection({ order }: { order: Order }) {
  const method = inferPaymentMethodLabel(order);
  const hasPaymentDetails =
    order.paymentReference || order.paymentProof || order.paymentNotes || order.adminPaymentNotes;

  return (
    <section className="rounded-xl bg-amber-50/80 border border-amber-200/60 p-3 sm:p-4 min-w-0">
      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">طريقة الدفع</h4>
      <p className="font-semibold text-gray-900 break-words">{method}</p>
      <p className="text-sm text-gray-600 mt-1">
        حالة الدفع: {PAYMENT_STATUS_AR[order.paymentStatus] ?? order.paymentStatus}
      </p>

      {hasPaymentDetails && (
        <div className="mt-3 space-y-3 text-sm min-w-0">
          {order.paymentReference && (
            <div>
              <p className="text-xs text-gray-500">مرجع التحويل</p>
              <p className="font-medium ltr-input break-all" dir="ltr">{order.paymentReference}</p>
            </div>
          )}
          {order.paymentNotes && (
            <div>
              <p className="text-xs text-gray-500">ملاحظات العميل</p>
              <p className="text-gray-800 break-words">{order.paymentNotes}</p>
            </div>
          )}
          {order.adminPaymentNotes && (
            <div>
              <p className="text-xs text-gray-500">ملاحظات الإدارة</p>
              <p className="text-gray-800 break-words">{order.adminPaymentNotes}</p>
            </div>
          )}
          {order.paymentProof && (
            <div>
              <p className="text-xs text-gray-500 mb-2">إثبات الدفع</p>
              <a
                href={order.paymentProof}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative w-full max-w-full min-h-[160px] max-h-[min(360px,50vh)] rounded-xl overflow-hidden border border-gray-200 bg-white">
                  <Image
                    src={order.paymentProof}
                    alt="إثبات الدفع"
                    width={800}
                    height={800}
                    className="w-full h-auto max-h-[min(360px,50vh)] object-contain"
                    sizes="(max-width: 640px) 100vw, 480px"
                  />
                </div>
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
