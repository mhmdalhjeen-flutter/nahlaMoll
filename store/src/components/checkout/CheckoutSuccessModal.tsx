'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatCustomerOrderNumber } from '@/lib/order-number';

export interface CheckoutSuccessInfo {
  orderId: string;
  orderNumber: string;
  isFreeDelivery: boolean;
}

interface CheckoutSuccessModalProps {
  open: boolean;
  order: CheckoutSuccessInfo | null;
}

export function CheckoutSuccessModal({ open, order }: CheckoutSuccessModalProps) {
  const router = useRouter();

  if (!order) return null;

  const goHome = () => {
    router.push('/');
  };

  const goToOrder = () => {
    router.push(`/orders/${order.orderId}`);
  };

  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissible={false}
      title="تم إرسال طلبك للمتجر"
      subtitle="سيتم التواصل معك لتأكيد الطلب"
      className="max-w-md"
    >
      <div className="space-y-5 -mt-1">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success-600" aria-hidden />
          </div>
        </div>

        <div className="text-center">
          <p className="text-base font-semibold text-gray-900 tabular-nums tracking-wide">
            رقم الطلب {formatCustomerOrderNumber(order.orderNumber)}
          </p>
        </div>

        {order.isFreeDelivery && (
          <p
            className={cn(
              'text-sm font-medium text-success-700 text-center',
              'bg-success-50 border border-success-100 rounded-xl px-4 py-3 leading-relaxed',
            )}
          >
            حيصلك الطلب باب الدار مجانا
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-[48px]"
            onClick={goHome}
          >
            حسنًا
          </Button>
          <Button
            type="button"
            className="flex-1 min-h-[48px] btn-cta"
            onClick={goToOrder}
          >
            مراجعة الطلب
          </Button>
        </div>
      </div>
    </Modal>
  );
}
