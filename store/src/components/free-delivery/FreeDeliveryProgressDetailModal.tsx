'use client';

import { Modal } from '@/components/ui/Modal';
import { formatPrice } from '@/lib/utils';
import { formatProgressPercent } from '@/lib/free-delivery';
import { FREE_DELIVERY_ELIGIBILITY_THRESHOLD } from '@/lib/delivery.constants';
import type { FreeDeliveryFabViewModel } from '@/lib/free-delivery-fab';

interface FreeDeliveryProgressDetailModalProps {
  open: boolean;
  onClose: () => void;
  view: FreeDeliveryFabViewModel;
}

export function FreeDeliveryProgressDetailModal({
  open,
  onClose,
  view,
}: FreeDeliveryProgressDetailModalProps) {
  const remainingDisplay =
    view.stage === 'eligible' || view.stage === 'complete'
      ? view.displayPct < 100
        ? `باقي ${Math.ceil(100 - view.displayPct)}% لإكمال شريط التقدّم`
        : 'أنت مؤهل للتوصيل المجاني'
      : view.remainingToEligibility > 0
        ? `باقي ${Math.ceil(view.remainingToEligibility)}% للوصول إلى التوصيل المجاني`
        : 'أنت على وشك الوصول';

  return (
    <Modal open={open} onClose={onClose} title="🚚 التوصيل المجاني" className="max-w-sm">
      <div className="space-y-4 text-right">
        <div className="text-center py-2">
          <p className="text-3xl font-bold tabular-nums text-navy-800">
            {formatProgressPercent(view.displayPct)}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1">
          <p className="text-xs text-gray-500">مجموع الشراء</p>
          <p className="text-lg font-bold tabular-nums text-navy-900">
            {formatPrice(view.subtotal)} ₪
          </p>
        </div>

        {view.headline && (
          <p className="text-sm font-semibold text-navy-800 leading-snug">{view.headline}</p>
        )}

        <p className="text-sm text-gray-600 leading-relaxed">{remainingDisplay}</p>

        {view.stage === 'eligible' || view.stage === 'complete' ? (
          <p className="text-sm text-success-700 font-medium">
            أنت مؤهل للتوصيل المجاني ({FREE_DELIVERY_ELIGIBILITY_THRESHOLD}%+).
          </p>
        ) : (
          <p className="text-sm text-gray-500 leading-relaxed">
            أضف منتجات مؤهلة للتوصيل المجاني إلى سلتك.
          </p>
        )}
      </div>
    </Modal>
  );
}
