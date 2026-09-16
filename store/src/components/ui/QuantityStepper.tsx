'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuantityStepperProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  /** When true, fills container width (detail page / card CTA slot). */
  fullWidth?: boolean;
}

export function QuantityStepper({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max,
  disabled = false,
  className,
  fullWidth = false,
}: QuantityStepperProps) {
  const atMin = disabled || quantity <= min;
  const atMax = disabled || (max != null && quantity >= max);

  const segmentBase = cn(
    'min-h-11 min-w-11 flex items-center justify-center touch-manipulation',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:z-10',
    'transition-colors motion-reduce:transition-none',
  );

  return (
    <div
      className={cn(
        'inline-grid grid-cols-3 rounded-xl border border-gray-200 bg-white overflow-hidden',
        fullWidth ? 'w-full' : 'w-fit',
        className,
      )}
      role="group"
      aria-label="الكمية"
    >
      <button
        type="button"
        disabled={atMin}
        aria-disabled={atMin}
        aria-label="تقليل الكمية"
        onClick={onDecrease}
        className={cn(
          segmentBase,
          'border-l border-gray-200 text-gray-700',
          atMin
            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
            : 'bg-white hover:bg-gray-50 active:scale-[0.98]',
        )}
      >
        <Minus className="w-4 h-4" aria-hidden />
      </button>

      <div
        className="flex items-center justify-center min-h-11 px-3 bg-gray-50 border-l border-gray-200 text-base font-bold text-gray-900 tabular-nums select-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {quantity}
      </div>

      <button
        type="button"
        disabled={atMax}
        aria-disabled={atMax}
        aria-label="زيادة الكمية"
        onClick={onIncrease}
        className={cn(
          segmentBase,
          'border-l border-gray-200',
          atMax
            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
            : 'bg-primary-500 text-gray-900 hover:bg-primary-600 active:scale-[0.98]',
        )}
      >
        <Plus className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
}
