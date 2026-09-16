'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PaymentProofUpload } from '@/components/checkout/PaymentProofUpload';
import type { Order } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';

interface PaymentResubmissionPanelProps {
  order: Order;
}

export function PaymentResubmissionPanel({ order }: PaymentResubmissionPanelProps) {
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const [transferAccountName, setTransferAccountName] = useState(order.paymentReference ?? '');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(order.paymentProof ?? null);

  const resubmit = useMutation({
    mutationFn: () =>
      storeApi.submitPayment(order.id, {
        paymentReference: transferAccountName.trim(),
        paymentNotes: order.paymentNotes ?? undefined,
        paymentProof: paymentProofUrl ?? undefined,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['order', order.id], updated);
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast('تم إرسال معلومات الدفع مجدداً', 'success');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const methodLabel = order.paymentNotes?.trim() || 'تحويل إلكتروني';

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-card space-y-4"
      aria-labelledby="payment-resubmit-title"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h2 id="payment-resubmit-title" className="font-bold text-gray-900 text-base">
            الدفع يحتاج إلى مراجعة
          </h2>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            يحتاج الدفع إلى مراجعة جديدة. يرجى التحقق من بيانات التحويل وإعادة إرسال إثبات الدفع.
          </p>
        </div>
      </div>

      {order.adminPaymentNotes && (
        <div className="rounded-xl bg-white/80 border border-amber-100 px-3 py-2.5 text-sm">
          <p className="text-xs text-gray-500 mb-0.5">ملاحظة من الإدارة</p>
          <p className="text-gray-800 leading-relaxed">{order.adminPaymentNotes}</p>
        </div>
      )}

      <p className="text-sm text-gray-700">
        <span className="text-gray-500">طريقة الدفع: </span>
        <span className="font-medium">{methodLabel}</span>
      </p>

      <div>
        <label htmlFor="resubmit-transfer-name" className="block text-sm font-medium text-gray-900 mb-2">
          اسم الحساب الذي تم التحويل منه <span className="text-error-500">*</span>
        </label>
        <Input
          id="resubmit-transfer-name"
          value={transferAccountName}
          onChange={(e) => setTransferAccountName(e.target.value)}
          placeholder="الاسم كما يظهر في التحويل"
          className="min-h-[48px]"
        />
      </div>

      <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />

      <Button
        className="w-full min-h-[48px] btn-cta"
        loading={resubmit.isPending}
        disabled={transferAccountName.trim().length === 0 || resubmit.isPending}
        onClick={() => resubmit.mutate()}
      >
        <RefreshCw className="w-4 h-4 ml-2" aria-hidden />
        إعادة إرسال إثبات الدفع
      </Button>
    </section>
  );
}

export function canResubmitPayment(order: Order): boolean {
  return order.status === 'PAYMENT_REJECTED' && order.paymentStatus === 'REJECTED';
}
