'use client';

import { cn } from '@/lib/utils';
import type { FreeDeliverySummary } from '@/lib/types';
import { formatProgressPercent } from '@/lib/free-delivery';
import { getVisualStage } from '@/lib/free-delivery-journey';
import { FreeDeliveryProgressBar } from '@/components/home/free-delivery/FreeDeliveryProgressBar';
import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';

interface FreeDeliveryProgressProps {
  summary: Pick<
    FreeDeliverySummary,
    | 'displayedScore'
    | 'target'
    | 'progressPercentage'
    | 'remainingScore'
    | 'isFreeDelivery'
    | 'deliveryFee'
  >;
  compact?: boolean;
  hideFeeDetails?: boolean;
  className?: string;
}

export function FreeDeliveryProgress({
  summary,
  compact,
  hideFeeDetails,
  className,
}: FreeDeliveryProgressProps) {
  const pct = Math.min(100, summary.progressPercentage);
  const achieved = summary.isFreeDelivery;
  const visualStage = getVisualStage(pct, achieved);

  return (
    <div className={cn('rounded-xl bg-primary-50 p-3 border border-primary-100', className)}>
      <div className="flex items-center gap-2 mb-2">
        <DeliveryScooterIcon
          className="w-5 h-5 shrink-0"
          accentClassName={achieved ? 'text-success-600' : 'text-cta-600'}
        />
        <span className="text-sm font-medium">
          {achieved
            ? '🎉 كملنا الباقي عنك… التوصيل علينا!'
            : `${formatProgressPercent(pct)} نحو التوصيل المجاني`}
        </span>
      </div>
      {!compact && (
        <>
          <FreeDeliveryProgressBar
            pct={pct}
            visualStage={visualStage}
            showLabels={false}
            className="mb-1"
          />
          <div className="flex justify-between text-xs text-gray-600 tabular-nums">
            <span>{formatProgressPercent(pct)}</span>
            {!achieved && summary.remainingScore > 0 && pct < 95 && (
              <span>متبقي {formatProgressPercent(summary.remainingScore)}</span>
            )}
          </div>
        </>
      )}
      {!hideFeeDetails && achieved && !compact && (
        <p className="text-xs text-success-600 mt-1">رسوم التوصيل: مجاني</p>
      )}
      {!hideFeeDetails && !achieved && !compact && summary.deliveryFee > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          رسوم التوصيل الحالية: {summary.deliveryFee.toFixed(2)} ₪
        </p>
      )}
    </div>
  );
}
