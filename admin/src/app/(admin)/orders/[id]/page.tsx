'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { adminApi } from '@/lib/admin-api';
import type { Order } from '@/lib/types';
import { formatPrice, getErrorMessage, ORDER_STATUS_AR } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/StateViews';
import { OrderBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/stores/toast-store';
import { getOptimizedImageUrl } from '@/lib/image-url';
import { formatCustomerOrderNumber } from '@/lib/order-number';

const STATUSES = Object.keys(ORDER_STATUS_AR);

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast((s) => s.show);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [confirmAction, setConfirmAction] = useState<'verify' | 'reject' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const o = await adminApi.getOrder(id);
      setOrder(o);
      setNewStatus(o.status);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async () => {
    if (!newStatus) return;
    setActionLoading(true);
    try {
      await adminApi.updateOrderStatus(id, newStatus, notes || undefined);
      toast('تم تحديث حالة الطلب', 'success');
      load();
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'verify') await adminApi.verifyPayment(id, notes || undefined);
      else await adminApi.rejectPayment(id, notes || undefined);
      toast(confirmAction === 'verify' ? 'تم التحقق من الدفع' : 'تم رفض الدفع', 'success');
      setConfirmAction(null);
      load();
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="card skeleton h-96" />;
  if (error || !order) return <ErrorState message={error ?? 'الطلب غير موجود'} onRetry={load} />;

  return (
    <div>
      <PageHeader title={`طلب ${formatCustomerOrderNumber(order.orderNumber)}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <h2 className="font-bold">معلومات العميل</h2>
          <Row label="الاسم" value={order.customer?.name ?? '—'} />
          <Row label="الهاتف" value={order.customer?.phoneNumber ?? '—'} ltr />
          <Row label="العنوان" value={order.deliveryAddress} />
          <Row label="منطقة التوصيل" value={order.deliveryArea?.name ?? '—'} />
          <Row label="تاريخ الطلب" value={new Date(order.createdAt).toLocaleString('ar')} />
          <div className="flex gap-2"><PaymentBadge status={order.paymentStatus} /><OrderBadge status={order.status} /></div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-bold">الملخص المالي</h2>
          <Row label="المجموع الفرعي" value={`${formatPrice(order.subtotal)} ₪`} />
          <Row label="رسوم التوصيل" value={`${formatPrice(order.deliveryFee)} ₪`} />
          <Row label="الإجمالي" value={`${formatPrice(order.total)} ₪`} bold />
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="font-bold mb-3">المنتجات</h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between border-b pb-2 text-sm">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.variantInfo && <p className="text-gray-500">{item.variantInfo}</p>}
                <p className="text-gray-500">× {item.quantity}</p>
              </div>
              <div className="text-left">
                <p>{formatPrice(item.price)} ₪</p>
                <p className="text-gray-500 text-xs">مساهمة التوصيل: {Number(item.freeDeliveryValue)}% / وحدة</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(order.paymentReference || order.paymentProof || order.paymentNotes) && (
        <div className="card mt-4 space-y-3">
          <h2 className="font-bold">معلومات الدفع</h2>
          {order.paymentReference && <Row label="مرجع الدفع" value={order.paymentReference} ltr />}
          {order.paymentNotes && <Row label="ملاحظات العميل" value={order.paymentNotes} />}
          {order.adminPaymentNotes && <Row label="ملاحظات الإدارة" value={order.adminPaymentNotes} />}
          {order.paymentProof && (
            <div>
              <p className="text-sm text-gray-500 mb-1">إثبات الدفع</p>
              <a href={order.paymentProof} target="_blank" rel="noopener noreferrer">
                <Image src={getOptimizedImageUrl(order.paymentProof, 'detail')} alt="إثبات الدفع" width={200} height={200} className="rounded-xl object-contain max-h-48" />
              </a>
            </div>
          )}
        </div>
      )}

      {order.paymentStatus === 'SUBMITTED' && (
        <div className="card mt-4 space-y-3">
          <h2 className="font-bold">التحقق من الدفع</h2>
          <textarea className="input" placeholder="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={actionLoading} onClick={() => setConfirmAction('verify')}>تحقق</button>
            <button type="button" className="btn-danger" disabled={actionLoading} onClick={() => setConfirmAction('reject')}>رفض</button>
          </div>
        </div>
      )}

      <div className="card mt-4 space-y-3">
        <h2 className="font-bold">تحديث حالة الطلب</h2>
        <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_AR[s]}</option>)}
        </select>
        <button type="button" className="btn-secondary" disabled={actionLoading} onClick={updateStatus}>تحديث الحالة</button>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === 'verify' ? 'تأكيد الدفع' : 'رفض الدفع'}
        message={confirmAction === 'verify' ? 'هل تريد تأكيد استلام الدفع؟ سيتم تأكيد الطلب.' : 'هل تريد رفض إثبات الدفع؟'}
        danger={confirmAction === 'reject'}
        confirmLabel={confirmAction === 'verify' ? 'تحقق' : 'رفض'}
        onConfirm={handlePaymentAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function Row({ label, value, ltr, bold }: { label: string; value: string; ltr?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? 'font-bold' : ''} dir={ltr ? 'ltr' : undefined}>{value}</span>
    </div>
  );
}
