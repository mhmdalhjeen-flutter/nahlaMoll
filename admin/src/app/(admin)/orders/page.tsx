'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import type { Order } from '@/lib/types';
import {
  countOrdersByTab,
  getOrdersForTab,
  getPrimaryAction,
  ORDER_TABS,
  WORKFLOW_NOTIFY_MESSAGE,
  canDeleteOrder,
  type OrderWorkflowTab,
} from '@/lib/order-workflow';
import { getErrorMessage } from '@/lib/utils';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/ui/StateViews';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { OrderStatusTabs } from '@/components/orders/OrderStatusTabs';
import { OrderCard } from '@/components/orders/OrderCard';
import { useToast } from '@/stores/toast-store';

async function notifyCustomer(userId: string, orderNumber: string, message: string) {
  try {
    await adminApi.replySupport(userId, message, `تحديث الطلب ${formatCustomerOrderNumber(orderNumber)}`);
  } catch {
    // Support thread notification is best-effort; order status is source of truth
  }
}

export default function OrdersPage() {
  const toast = useToast((s) => s.show);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderWorkflowTab>('pending');
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getOrders({ limit: 100 });
      setOrders(
        result.items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => countOrdersByTab(orders), [orders]);
  const visibleOrders = useMemo(
    () => getOrdersForTab(orders, activeTab),
    [orders, activeTab],
  );
  const activeTabMeta = ORDER_TABS.find((t) => t.id === activeTab);

  const patchOrderLocal = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const runPrimaryAction = async (order: Order) => {
    setActionOrderId(order.id);
    try {
      let current = order;

      if (order.status === 'PAYMENT_SUBMITTED') {
        current = await adminApi.verifyPayment(order.id);
        patchOrderLocal(current);
      }

      const action = getPrimaryAction(current);
      if (!action) return;

      const updated = await adminApi.updateOrderStatus(current.id, action.nextStatus);
      patchOrderLocal(updated);

      const notifyMsg = WORKFLOW_NOTIFY_MESSAGE[action.nextStatus];
      if (notifyMsg && current.customer?.id) {
        await notifyCustomer(current.customer.id, current.orderNumber, notifyMsg);
      }

      toast('تم تحديث الطلب بنجاح', 'success');
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setActionOrderId(null);
    }
  };

  const runVerifyPayment = async (order: Order) => {
    setActionOrderId(order.id);
    try {
      const updated = await adminApi.verifyPayment(order.id);
      patchOrderLocal(updated);
      toast('تم التحقق من الدفع', 'success');
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setActionOrderId(null);
    }
  };

  const runRejectPayment = async () => {
    if (!rejectOrderId) return;
    setActionOrderId(rejectOrderId);
    try {
      const updated = await adminApi.rejectPayment(rejectOrderId);
      patchOrderLocal(updated);
      toast('تم رفض الدفع', 'success');
      setRejectOrderId(null);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setActionOrderId(null);
    }
  };

  const runCancelOrder = async () => {
    if (!cancelOrderId) return;
    setActionOrderId(cancelOrderId);
    try {
      const order = orders.find((o) => o.id === cancelOrderId);
      const updated = await adminApi.updateOrderStatus(cancelOrderId, 'CANCELLED');
      patchOrderLocal(updated);
      if (order?.customer?.id) {
        await notifyCustomer(
          order.customer.id,
          order.orderNumber,
          WORKFLOW_NOTIFY_MESSAGE.CANCELLED ?? 'تم إلغاء طلبك.',
        );
      }
      toast('تم إلغاء الطلب', 'success');
      setCancelOrderId(null);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setActionOrderId(null);
    }
  };

  const runDeleteOrder = async () => {
    if (!deleteOrderId) return;
    setActionOrderId(deleteOrderId);
    try {
      await adminApi.deleteOrder(deleteOrderId);
      setOrders((prev) => prev.filter((o) => o.id !== deleteOrderId));
      toast('تم حذف الطلب', 'success');
      setDeleteOrderId(null);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setActionOrderId(null);
    }
  };

  return (
    <div className="pb-8 min-w-0 max-w-full">
      <PageHeader title="الطلبات" />

      <OrderStatusTabs active={activeTab} counts={counts} onChange={setActiveTab} />

      {!loading && !error && activeTabMeta && (
        <h2 className="text-lg font-bold text-gray-900 mb-4">{activeTabMeta.sectionTitle}</h2>
      )}

      {loading && <LoadingGrid count={3} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && visibleOrders.length === 0 && (
        <EmptyState message={`لا توجد طلبات في «${activeTabMeta?.label ?? ''}»`} />
      )}

      {!loading && !error && visibleOrders.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              tab={activeTab}
              loading={actionOrderId === order.id}
              onPrimaryAction={() => runPrimaryAction(order)}
              onCancelOrder={() => setCancelOrderId(order.id)}
              onVerifyPayment={() => runVerifyPayment(order)}
              onRejectPayment={() => setRejectOrderId(order.id)}
              onDelete={
                canDeleteOrder(order) ? () => setDeleteOrderId(order.id) : undefined
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelOrderId}
        title="إلغاء الطلب"
        message="سيتم إلغاء هذا الطلب ولن يظهر للعميل كطلب قيد المراجعة. هل تريد المتابعة؟"
        danger
        confirmLabel="إلغاء الطلب"
        onConfirm={runCancelOrder}
        onCancel={() => setCancelOrderId(null)}
      />

      <ConfirmDialog
        open={!!deleteOrderId}
        title="حذف الطلب"
        message="سيتم حذف هذا الطلب نهائياً من قائمتك. لا يمكن التراجع."
        danger
        confirmLabel="حذف"
        onConfirm={runDeleteOrder}
        onCancel={() => setDeleteOrderId(null)}
      />

      <ConfirmDialog
        open={!!rejectOrderId}
        title="رفض الدفع"
        message="هل تريد رفض إثبات الدفع؟ سيتمكن العميل من إعادة الإرسال."
        danger
        confirmLabel="رفض"
        onConfirm={runRejectPayment}
        onCancel={() => setRejectOrderId(null)}
      />
    </div>
  );
}
