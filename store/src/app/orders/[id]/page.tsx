'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { OrderProgress } from '@/components/orders/OrderProgress';
import {
  OrderInvoiceSection,
  OrderProductsSection,
} from '@/components/orders/OrderInvoiceSection';
import { OrderCancelDialog } from '@/components/orders/OrderCancelDialog';
import { OrderReviewModal } from '@/components/orders/OrderReviewModal';
import {
  canResubmitPayment,
  PaymentResubmissionPanel,
} from '@/components/checkout/PaymentResubmissionPanel';
import {
  canCustomerCancelOrder,
  canDeleteOrder,
  isCashOnDeliveryOrder,
} from '@/lib/order-utils';
import {
  getCustomerOrderActions,
  getCustomerOrderActionLabel,
  getCustomerOrderStatus,
  getOrderPaymentMethodLabel,
  hasOrderReviewRequest,
} from '@/lib/customer-order-ui';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import { formatPrice, getErrorMessage } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';
import { ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OrderDetailPage() {
  return (
    <AuthGuard>
      <OrderDetailContent />
    </AuthGuard>
  );
}

function OrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => storeApi.getOrder(id),
    enabled: !!id,
    retry: false,
  });

  const { data: supportMessages } = useQuery({
    queryKey: ['support-messages'],
    queryFn: storeApi.getSupportMessages,
  });

  useEffect(() => {
    if (!isLoading && (isError || !order)) {
      router.replace('/');
    }
  }, [isLoading, isError, order, router]);

  const cancelMutation = useMutation({
    mutationFn: () => storeApi.cancelOrder(id),
    onSuccess: (updated) => {
      qc.setQueryData(['order', id], updated);
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast('تم إلغاء الطلب', 'success');
      setCancelOpen(false);
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => storeApi.deleteOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast('تم حذف الطلب', 'success');
      router.push('/orders');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  if (isLoading || !order) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const statusView = getCustomerOrderStatus(order);
  const actions = getCustomerOrderActions(order);
  const reviewSubmitted = hasOrderReviewRequest(supportMessages ?? [], order.id);
  const isCod = isCashOnDeliveryOrder(order);
  const showCancel = canCustomerCancelOrder(order);
  const showDelete = canDeleteOrder(order);
  const showPaymentResubmit = canResubmitPayment(order);
  const codPaidOnDelivery =
    order.status === 'DELIVERED' && isCod && order.paymentStatus === 'VERIFIED';

  return (
    <div className="container mx-auto px-4 py-5 pb-32 max-w-2xl space-y-4">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors min-h-[44px]"
      >
        <ChevronRight className="w-4 h-4" />
        العودة للطلبات
      </Link>

      <header className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500">طلب</p>
            <h1 className="text-xl font-bold text-gray-900 tabular-nums">
              {formatCustomerOrderNumber(order.orderNumber)}
            </h1>
          </div>
          <StatusBadge label={statusView.label} tone={statusView.tone} />
        </div>
        {statusView.helper && (
          <p className="text-sm text-gray-600 leading-relaxed">{statusView.helper}</p>
        )}
        {statusView.showProgress && (
          <OrderProgress status={order.status} className="pt-1" />
        )}
      </header>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-card">
        <OrderProductsSection order={order} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-card">
        <OrderInvoiceSection order={order} />
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card space-y-2 text-sm">
        <h2 className="font-bold text-gray-900 text-base">عنوان التوصيل</h2>
        {order.deliveryArea && (
          <p className="text-gray-700">
            <span aria-hidden>📍 </span>
            {order.deliveryArea.name}
          </p>
        )}
        <div>
          <p className="text-gray-500 text-xs mb-1">العنوان التفصيلي</p>
          <p className="font-medium leading-relaxed text-gray-900">{order.deliveryAddress}</p>
        </div>
        {order.notes && (
          <p>
            <span className="text-gray-500">ملاحظات: </span>
            <span>{order.notes}</span>
          </p>
        )}
      </section>

      {showPaymentResubmit ? (
        <PaymentResubmissionPanel order={order} />
      ) : (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card space-y-3 text-sm">
          <h2 className="font-bold text-gray-900 text-base">طريقة الدفع</h2>
          <p className="text-gray-800 font-medium">{getOrderPaymentMethodLabel(order)}</p>

          {!isCod && order.paymentReference && (
            <p>
              <span className="text-gray-500">اسم حساب التحويل: </span>
              <span className="font-medium break-all">{order.paymentReference}</span>
            </p>
          )}

          {order.paymentStatus === 'SUBMITTED' && (
            <p className="text-primary-800 bg-primary-50 rounded-xl px-3 py-2.5">
              تم إرسال معلومات الدفع. بانتظار مراجعة الإدارة.
            </p>
          )}
          {order.paymentStatus === 'VERIFIED' && !codPaidOnDelivery && (
            <p className="text-success-800 bg-success-50 rounded-xl px-3 py-2.5">
              ✓ تم التحقق من الدفع
            </p>
          )}
          {codPaidOnDelivery && (
            <p className="text-success-800 bg-success-50 rounded-xl px-3 py-2.5">
              ✓ تم التسليم واستلام الدفع نقداً
            </p>
          )}
          {isCod && order.status !== 'DELIVERED' && order.paymentStatus === 'PENDING' && (
            <p className="text-warning-800 bg-warning-50 rounded-xl px-3 py-2.5">
              الدفع نقداً عند الاستلام — لم يُدفع بعد
            </p>
          )}
        </section>
      )}

      {reviewSubmitted && (order.status === 'DELIVERED' || order.status === 'PAYMENT_REJECTED') && (
        <div className="rounded-2xl border border-success-100 bg-success-50 p-4 text-sm text-success-800">
          <p className="font-semibold">✓ تمت مراجعة الطلب</p>
          <p className="mt-1 leading-relaxed">
            تم استلام مراجعتك، وسنراجع الطلب ونتواصل معك عند الحاجة.
          </p>
        </div>
      )}

      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 safe-area-pb">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {actions.primary === 'review' && !reviewSubmitted && (
            <Button
              type="button"
              className="w-full min-h-[48px] text-base btn-secondary"
              onClick={() => setReviewOpen(true)}
            >
              {getCustomerOrderActionLabel('review')}
            </Button>
          )}
          {showCancel && (
            <Button
              variant="secondary"
              className="w-full min-h-[48px] text-base"
              onClick={() => setCancelOpen(true)}
            >
              إلغاء الطلب
            </Button>
          )}
          {showDelete && (
            <Button
              variant="danger"
              className={cn('w-full min-h-[48px] text-base')}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف الطلب
            </Button>
          )}
        </div>
      </div>

      <OrderCancelDialog
        open={cancelOpen}
        loading={cancelMutation.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
      />

      <OrderReviewModal
        open={reviewOpen}
        order={order}
        onClose={() => setReviewOpen(false)}
        onSubmitted={() => qc.invalidateQueries({ queryKey: ['support-messages'] })}
      />
    </div>
  );
}
