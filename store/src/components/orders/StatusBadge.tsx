'use client';

import { cn } from '@/lib/utils';

const TONE_CLASSES = {
  neutral: 'bg-gray-100 text-gray-700',
  warning: 'bg-warning-50 text-warning-800',
  success: 'bg-success-50 text-success-800',
  danger: 'bg-error-50 text-error-700',
  info: 'bg-primary-50 text-primary-800',
};

interface StatusBadgeProps {
  label: string;
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
}

export function StatusBadge({ label, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
