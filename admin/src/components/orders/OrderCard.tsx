'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { getPrimaryAction, inferPaymentMethodLabel, canAdminCancelOrder, type OrderWorkflowTab } from '@/lib/order-workflow';
import type { Order } from '@/lib/types';
import { formatPrice, PAYMENT_STATUS_AR } from '@/lib/utils';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import { OrderBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { OrderDetailsContent } from '@/components/orders/OrderDetailsContent';
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';

interface OrderCardProps {
  order: Order;
  tab: OrderWorkflowTab;
  loading?: boolean;
  onPrimaryAction?: () => void;
  onCancelOrder?: () => void;
  onVerifyPayment?: () => void;
  onRejectPayment?: () => void;
  onDelete?: () => void;
}

export function OrderCard({
  order,
  tab,
  loading,
  onPrimaryAction,
  onCancelOrder,
  onVerifyPayment,
  onRejectPayment,
  onDelete,
}: OrderCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const action = getPrimaryAction(order);
  const isCompactTab = tab === 'delivered' || tab === 'cancelled';
  const created = new Date(order.createdAt).toLocaleString('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const paymentMethod = inferPaymentMethodLabel(order);

  return (
    <>
      <article className="card p-0 overflow-hidden hover:shadow-lg transition-shadow duration-200 min-w-0">
        <div className="bg-gradient-to-l from-gray-50 to-white px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">طلب</p>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight tabular-nums">
                {formatCustomerOrderNumber(order.orderNumber)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{created}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <OrderBadge status={order.status} />
              <PaymentBadge status={order.paymentStatus} />
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-5 space-y-4 min-w-0">
          {/* Mobile / tablet summary */}
          <div className="lg:hidden space-y-3">
            <dl className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 text-sm">
              <SummaryItem label="الزبون" value={order.customer?.name ?? '—'} />
              <SummaryItem
                label="الهاتف"
                value={order.customer?.phoneNumber ?? '—'}
                ltr
              />
              <SummaryItem label="طريقة الدفع" value={paymentMethod} />
              <SummaryItem
                label="حالة الدفع"
                value={PAYMENT_STATUS_AR[order.paymentStatus] ?? order.paymentStatus}
              />
              <SummaryItem
                label="المجموع"
                value={`${formatPrice(order.total)} ₪`}
                highlight
                ltr
              />
            </dl>

            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-1">العنوان</p>
              <p className="text-sm text-gray-800 leading-relaxed line-clamp-3 break-words">
                {order.deliveryAddress}
              </p>
              {order.deliveryArea?.name && (
                <p className="text-xs text-gray-500 mt-1">منطقة: {order.deliveryArea.name}</p>
              )}
            </div>

            <button
              type="button"
              className="btn-secondary w-full min-h-[48px] text-base"
              onClick={() => setDetailsOpen(true)}
            >
              <Eye className="w-4 h-4 ml-2 shrink-0" />
              عرض التفاصيل والفاتورة
            </button>
          </div>

          {/* Desktop: full inline details */}
          <div className="hidden lg:block">
            {!isCompactTab ? (
              <OrderDetailsContent order={order} compactHeader />
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SummaryItem label="الزبون" value={order.customer?.name ?? '—'} block />
                <SummaryItem
                  label="التاريخ"
                  value={new Date(order.createdAt).toLocaleDateString('ar')}
                  block
                />
                <SummaryItem
                  label="المجموع"
                  value={`${formatPrice(order.total)} ₪`}
                  highlight
                  ltr
                  block
                />
                <SummaryItem label="طريقة الدفع" value={paymentMethod} block />
              </div>
            )}
          </div>

          <OrderActions
            order={order}
            tab={tab}
            loading={loading}
            action={action}
            onPrimaryAction={onPrimaryAction}
            onCancelOrder={onCancelOrder}
            onVerifyPayment={onVerifyPayment}
            onRejectPayment={onRejectPayment}
            onDelete={onDelete}
          />
        </div>
      </article>

      <OrderDetailsModal order={detailsOpen ? order : null} onClose={() => setDetailsOpen(false)} />
    </>
  );
}

function SummaryItem({
  label,
  value,
  ltr,
  highlight,
  block,
}: {
  label: string;
  value: string;
  ltr?: boolean;
  highlight?: boolean;
  block?: boolean;
}) {
  return (
    <div className={block ? undefined : 'min-w-0 rounded-xl bg-gray-50 px-3 py-2.5'}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd
        className={`font-medium mt-0.5 break-words ${highlight ? 'text-primary-700 font-bold' : 'text-gray-900'} ${ltr ? 'ltr-input' : ''}`}
        dir={ltr ? 'ltr' : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function OrderActions({
  order,
  tab,
  loading,
  action,
  onPrimaryAction,
  onCancelOrder,
  onVerifyPayment,
  onRejectPayment,
  onDelete,
}: {
  order: Order;
  tab: OrderWorkflowTab;
  loading?: boolean;
  action: ReturnType<typeof getPrimaryAction>;
  onPrimaryAction?: () => void;
  onCancelOrder?: () => void;
  onVerifyPayment?: () => void;
  onRejectPayment?: () => void;
  onDelete?: () => void;
}) {
  const showPaymentActions = order.status === 'PAYMENT_SUBMITTED' && tab === 'pending';
  const showPrimary = action && tab !== 'delivered' && tab !== 'cancelled';
  const showCancel = canAdminCancelOrder(order) && tab === 'pending' && onCancelOrder;

  if (!showPaymentActions && !showPrimary && !showCancel && !onDelete) return null;

  return (
    <div className="space-y-2 pt-3 border-t border-gray-100">
      {showPaymentActions && (
        <div className="space-y-2">
          <button
            type="button"
            className="btn-secondary w-full min-h-[48px] text-base"
            disabled={loading}
            onClick={onVerifyPayment}
          >
            تحقق من الدفع فقط
          </button>
          <button
            type="button"
            className="btn-danger w-full min-h-[48px] text-base"
            disabled={loading}
            onClick={onRejectPayment}
          >
            رفض الدفع
          </button>
        </div>
      )}

      {(showPrimary || showCancel) && (
        <div className={showPrimary && showCancel ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-2'}>
          {showPrimary && (
            <button
              type="button"
              className="btn-primary w-full min-h-[48px] text-base font-bold"
              disabled={loading}
              onClick={onPrimaryAction}
            >
              {loading ? 'جاري التحديث...' : action!.label}
            </button>
          )}
          {showCancel && (
            <button
              type="button"
              className="btn-danger w-full min-h-[48px] text-base font-bold"
              disabled={loading}
              onClick={onCancelOrder}
            >
              {loading ? 'جاري التحديث...' : 'إلغاء الطلب'}
            </button>
          )}
        </div>
      )}

      {onDelete && (
        <button
          type="button"
          className="btn-danger w-full min-h-[48px] text-base font-bold"
          disabled={loading}
          onClick={onDelete}
        >
          حذف الطلب
        </button>
      )}
    </div>
  );
}
