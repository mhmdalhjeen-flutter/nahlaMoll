'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import type { Order } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

interface OrderReviewModalProps {
  open: boolean;
  order: Order;
  onClose: () => void;
  onSubmitted: () => void;
}

export function OrderReviewModal({ open, order, onClose, onSubmitted }: OrderReviewModalProps) {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      storeApi.sendSupportMessage({
        subject: `مراجعة الطلب ${formatCustomerOrderNumber(order.orderNumber)}`,
        message: message.trim(),
        orderId: order.id,
      }),
    onSuccess: () => {
      setSubmitted(true);
      onSubmitted();
    },
  });

  const handleClose = () => {
    setMessage('');
    setSubmitted(false);
    submit.reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="مراجعة الطلب"
      subtitle={
        order.status === 'PAYMENT_REJECTED'
          ? 'احكيلنا شو المشكلة أو شو حابب نعرف عن الطلب.'
          : 'احكيلنا شو المشكلة في الطلب حتى نقدر نساعدك.'
      }
      className="max-w-md"
    >
      {submitted ? (
        <div className="space-y-4 text-center py-2">
          <p className="text-success-700 font-semibold">✓ تمت مراجعة الطلب</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            تم استلام مراجعتك، وسنراجع الطلب ونتواصل معك عند الحاجة.
          </p>
          <Button type="button" className="w-full min-h-[48px]" onClick={handleClose}>
            حسنًا
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim().length < 3) return;
            submit.mutate();
          }}
        >
          <div>
            <label htmlFor="order-review-message" className="sr-only">
              سبب المراجعة
            </label>
            <textarea
              id="order-review-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب سبب المراجعة..."
              rows={4}
              className="input resize-none min-h-[120px]"
              required
              minLength={3}
              maxLength={5000}
            />
          </div>

          {submit.error && (
            <p className="text-sm text-error-600" role="alert">
              {getErrorMessage(submit.error)}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-[48px]"
              onClick={handleClose}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              className="flex-1 min-h-[48px] btn-cta"
              loading={submit.isPending}
              disabled={message.trim().length < 3}
            >
              إرسال المراجعة
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
