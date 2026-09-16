'use client';

import { cn, formatPrice } from '@/lib/utils';
import type { DeliveryArea } from '@/lib/types';
import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';

interface DeliveryAreaListItemProps {
  area: DeliveryArea;
  className?: string;
  compact?: boolean;
}

/** Read-only delivery area row — names and fees only, no internal type labels. */
export function DeliveryAreaListItem({
  area,
  className,
  compact = false,
}: DeliveryAreaListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3',
        compact ? 'py-2' : 'py-2.5',
        className,
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
        <DeliveryScooterIcon className="w-4 h-4" accentClassName="text-cta-600" />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-sm font-medium text-gray-900">{area.name}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          رسوم التوصيل: {formatPrice(area.deliveryFee)} ₪
          {area.eligibleForFreeDelivery
            ? ' — مؤهلة للتوصيل المجاني'
            : ' — غير مؤهلة للتوصيل المجاني'}
        </p>
      </div>
    </div>
  );
}
