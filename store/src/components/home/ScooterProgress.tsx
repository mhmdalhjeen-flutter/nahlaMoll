'use client';

import { cn } from '@/lib/utils';
import { formatProgressPercent } from '@/lib/free-delivery';
import { getVisualStage } from '@/lib/free-delivery-journey';
import { FreeDeliveryProgressBar } from './free-delivery/FreeDeliveryProgressBar';

interface ScooterProgressProps {
  displayed: number;
  target: number;
  achieved: boolean;
  pct?: number;
  compact?: boolean;
  className?: string;
}

/** @deprecated Prefer FreeDeliveryProgressBar — kept for legacy imports */
export function ScooterProgress({
  displayed,
  target,
  achieved,
  pct,
  compact,
  className,
}: ScooterProgressProps) {
  const barPct = Math.min(
    100,
    pct ?? (target > 0 ? (displayed / target) * 100 : 0),
  );
  const visualStage = getVisualStage(barPct, achieved);

  return (
    <FreeDeliveryProgressBar
      pct={barPct}
      visualStage={visualStage}
      compact={compact}
      className={className}
      label={`${formatProgressPercent(barPct)}`}
    />
  );
}
