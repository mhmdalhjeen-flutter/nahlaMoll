'use client';

import { cn } from '@/lib/utils';
import { formatProgressPercent } from '@/lib/free-delivery';
import type { FreeDeliveryVisualStage } from '@/lib/free-delivery-journey';

/** Full class names here so Tailwind JIT always includes stage fill colors. */
const STAGE_FILL_CLASS: Record<FreeDeliveryVisualStage, string> = {
  none: 'bg-transparent',
  yellow: 'bg-primary-400',
  blue: 'bg-navy-500',
  orange: 'bg-primary-600',
  green: 'bg-success-600',
};

interface FreeDeliveryProgressBarProps {
  pct: number;
  visualStage: FreeDeliveryVisualStage;
  label?: string;
  compact?: boolean;
  className?: string;
  showLabels?: boolean;
}

export function FreeDeliveryProgressBar({
  pct,
  visualStage,
  label,
  compact,
  className,
  showLabels = false,
}: FreeDeliveryProgressBarProps) {
  const barPct = Math.min(100, Math.max(0, pct));
  const stage = visualStage === 'none' || barPct <= 0 ? 'none' : visualStage;
  const fillClass = STAGE_FILL_CLASS[stage];
  const ariaLabel = label ?? `${Math.round(barPct)}%`;

  return (
    <div
      className={cn('w-full', compact ? 'py-0' : 'py-0.5', className)}
      aria-label={`${ariaLabel} تقدم`}
    >
      {!compact && showLabels && label && (
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <span className="text-[11px] sm:text-xs font-medium text-gray-600">{label}</span>
          <span className="text-xs sm:text-sm font-bold tabular-nums text-gray-900">
            {formatProgressPercent(barPct)}
          </span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={Math.round(barPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className={cn(
          'w-full bg-gray-200 rounded-full overflow-hidden',
          compact ? 'h-1' : 'h-3',
        )}
      >
        {barPct > 0 && (
          <div
            className={cn(
              'h-full rounded-full motion-reduce:transition-none transition-[width] duration-500 ease-out',
              fillClass,
            )}
            style={{ width: `${barPct}%` }}
          />
        )}
      </div>
    </div>
  );
}
