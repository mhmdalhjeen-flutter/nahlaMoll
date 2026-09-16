'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { storeApi } from '@/lib/store-api';
import { useClosedStoreStore } from '@/stores/closed-store-store';
import { useToastStore } from '@/stores/toast-store';
import { acknowledgeClosedStoreWarning } from '@/lib/closed-store-session';
import { getErrorMessage } from '@/lib/utils';

export function StoreClosedModal() {
  const { open, pending, mode, close } = useClosedStoreStore();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const waitMutation = useMutation({
    mutationFn: async () => {
      if (!pending) return null;
      if (pending.type === 'ADD_TO_CART') {
        return storeApi.registerStoreWait({
          type: 'ADD_TO_CART',
          productId: pending.product.id,
          variantId: pending.variantId,
          quantity: pending.quantity ?? 1,
        });
      }
      return storeApi.registerStoreWait({
        type: 'CHECKOUT',
        deliveryAreaId: pending.deliveryAreaId,
        deliveryAddress: pending.deliveryAddress,
        notes: pending.notes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-wait'] });
      toast('تم تسجيل طلبك، وسيتم إشعارك عند فتح المتجر.', 'success');
      acknowledgeClosedStoreWarning();
      close();
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
    onSettled: () => setSubmitting(false),
  });

  const handleWait = () => {
    if (submitting || waitMutation.isPending) return;
    setSubmitting(true);
    waitMutation.mutate();
  };

  const handleDismiss = () => {
    if (submitting || waitMutation.isPending) return;
    acknowledgeClosedStoreWarning();
    close();
  };

  const isSubmitMode = mode === 'submit';

  return (
    <Modal
      open={open}
      onClose={handleDismiss}
      title="المتجر مغلق حاليًا"
      subtitle={
        isSubmitMode
          ? 'لا يمكن إرسال الطلب الآن. يمكنك حفظه ليُنفَّذ عند فتح المتجر.'
          : 'يمكنك متابعة التسوق وتجهيز طلبك — سيتم التحقق من حالة المتجر عند تأكيد الإرسال.'
      }
      className="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-warning-50 border border-warning-100 px-3 py-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-warning-100 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-warning-600" />
          </div>
          <p className="text-sm text-warning-800 leading-relaxed">
            {isSubmitMode
              ? 'المتجر غير متاح لاستقبال الطلبات حالياً. يمكنك الانتظار وسيتم إشعارك عند فتحه.'
              : 'المتجر مغلق حالياً، لكن يمكنك إضافة المنتجات وتعديل السلة بحرية حتى تكون جاهزاً للإرسال.'}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-col gap-2 pt-1">
          <Button
            className="w-full min-h-[48px]"
            loading={submitting || waitMutation.isPending}
            disabled={submitting || waitMutation.isPending}
            onClick={handleWait}
          >
            إرسال الطلب عند فتح المتجر
          </Button>
          <Button
            variant="secondary"
            className="w-full min-h-[44px]"
            disabled={submitting || waitMutation.isPending}
            onClick={handleDismiss}
          >
            حسنًا
          </Button>
        </div>
      </div>
    </Modal>
  );
}
