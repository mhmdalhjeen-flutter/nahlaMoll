'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CheckoutSectionProps {
  title: string;
  step?: number;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function CheckoutSection({ title, step, children, className, id }: CheckoutSectionProps) {
  return (
    <section id={id} className={cn('card p-4', className)} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="flex items-center gap-2 mb-4">
        {step != null && (
          <span
            className="shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center tabular-nums"
            aria-hidden
          >
            {step}
          </span>
        )}
        <h2 id={id ? `${id}-title` : undefined} className="font-bold text-gray-900">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
