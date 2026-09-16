'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import {
  getCustomerOrderActions,
  getCustomerOrderStatus,
  getOrderItemCount,
  formatOrderDateTime,
  getCustomerOrderActionLabel,
} from '@/lib/customer-order-ui';
import type { Order } from '@/lib/types';
import { formatPrice, getErrorMessage } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { OrderProgress } from '@/components/orders/OrderProgress';
import { OrderCancelDialog } from '@/components/orders/OrderCancelDialog';
import { OrderReviewModal } from '@/components/orders/OrderReviewModal';
import { cn } from '@/lib/utils';

interface CustomerOrderCardProps {
  order: Order;
  reviewSubmitted?: boolean;
  className?: string;
}

export function CustomerOrderCard({
  order,
  reviewSubmitted = false,
  className,
}: CustomerOrderCardProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const statusView = getCustomerOrderStatus(order);
  const actions = getCustomerOrderActions(order);
  const itemCount = getOrderItemCount(order);

  const cancelMutation = useMutation({
    mutationFn: () => storeApi.cancelOrder(order.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setCancelOpen(false);
      toast('تم إلغاء الطلب', 'success');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const openDetails = () => router.push(`/orders/${order.id}`);

  const handleCardClick = () => openDetails();

  const handlePrimaryAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actions.primary === 'review') {
      setReviewOpen(true);
      return;
    }
    openDetails();
  };

  const handleSecondaryAction = (action: typeof actions.secondary[number], e: React.MouseEvent) => {
    e.stopPropagation();
    if (action === 'cancel') {
      setCancelOpen(true);
      return;
    }
    if (action === 'review') {
      setReviewOpen(true);
      return;
    }
    openDetails();
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetails();
          }
        }}
        className={cn(
          'rounded-2xl border border-gray-100 bg-white shadow-card',
          'hover:shadow-card-hover transition-shadow cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          className,
        )}
        aria-label={`طلب ${formatCustomerOrderNumber(order.orderNumber)}`}
      >
        <div className="p-4 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">طلب</p>
                  <h2 className="text-lg font-bold text-gray-900 tabular-nums">
                    {formatCustomerOrderNumber(order.orderNumber)}
                  </h2>
                </div>
                <StatusBadge label={statusView.label} tone={statusView.tone} />
              </div>

              <p className="text-xs text-gray-500">{formatOrderDateTime(order.createdAt)}</p>

              {statusView.helper && (
                <p className="text-sm text-gray-600 leading-relaxed">{statusView.helper}</p>
              )}
            </div>

            <div className="md:text-left shrink-0">
              <p className="text-sm text-gray-500 md:text-left">
                {itemCount} {itemCount === 1 ? 'منتج' : 'منتجات'}
              </p>
              <p className="text-lg font-bold text-primary-700 tabular-nums">
                {formatPrice(order.total)} ₪
              </p>
            </div>
          </div>

          {statusView.showProgress && (
            <OrderProgress status={order.status} compact className="pt-1" />
          )}

          <div
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            {actions.secondary.map((action) => (
              <Button
                key={action}
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] w-full sm:w-auto"
                onClick={(e) => handleSecondaryAction(action, e)}
              >
                {getCustomerOrderActionLabel(action)}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              className={cn(
                'min-h-[44px] w-full sm:w-auto',
                actions.primary === 'review' ? 'btn-secondary' : 'btn-cta',
              )}
              onClick={handlePrimaryAction}
              disabled={actions.primary === 'review' && reviewSubmitted}
            >
              {actions.primary === 'review' && reviewSubmitted
                ? '✓ تمت مراجعة الطلب'
                : getCustomerOrderActionLabel(actions.primary)}
            </Button>
          </div>
        </div>
      </article>

      <OrderCancelDialog
        open={cancelOpen}
        loading={cancelMutation.isPending}
        error={cancelMutation.error ? getErrorMessage(cancelMutation.error) : null}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
      />

      <OrderReviewModal
        open={reviewOpen}
        order={order}
        onClose={() => setReviewOpen(false)}
        onSubmitted={() => {
          qc.invalidateQueries({ queryKey: ['support-messages'] });
          setReviewOpen(false);
        }}
      />
    </>
  );
}
