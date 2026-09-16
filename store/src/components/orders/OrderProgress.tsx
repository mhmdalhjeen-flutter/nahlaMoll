'use client';

import { cn } from '@/lib/utils';
import {
  ORDER_PROGRESS_STEPS,
  getOrderProgressIndex,
} from '@/lib/customer-order-ui';
import type { OrderStatus } from '@/lib/types';

interface OrderProgressProps {
  status: OrderStatus;
  compact?: boolean;
  className?: string;
}

export function OrderProgress({ status, compact, className }: OrderProgressProps) {
  const current = getOrderProgressIndex(status);
  if (current < 0) return null;

  return (
    <div
      className={cn('w-full', className)}
      role="list"
      aria-label="مراحل الطلب"
    >
      <div
        className={cn(
          'flex items-start justify-between gap-1',
          compact ? 'px-0.5' : 'px-1',
        )}
      >
        {ORDER_PROGRESS_STEPS.map((label, index) => {
          const completed = index < current;
          const active = index === current;
          const upcoming = index > current;

          return (
            <div
              key={label}
              role="listitem"
              className="flex flex-1 min-w-0 flex-col items-center gap-1.5"
            >
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 rounded-full',
                      completed || active ? 'bg-primary-400' : 'bg-gray-200',
                    )}
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    'shrink-0 rounded-full border-2 transition-colors',
                    compact ? 'w-2.5 h-2.5' : 'w-3 h-3',
                    completed && 'bg-primary-500 border-primary-500',
                    active && 'bg-primary-600 border-primary-600 ring-2 ring-primary-100',
                    upcoming && 'bg-white border-gray-300',
                  )}
                  aria-current={active ? 'step' : undefined}
                />
                {index < ORDER_PROGRESS_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 rounded-full',
                      completed ? 'bg-primary-400' : 'bg-gray-200',
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-center leading-tight w-full',
                  compact ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs',
                  active && 'font-bold text-primary-700',
                  completed && 'font-medium text-primary-600',
                  upcoming && 'text-gray-400',
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
