'use client';

import { useToastStore } from '@/stores/toast-store';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

function ToastItem({
  id,
  message,
  type,
  action,
  onDismiss,
  variant,
  placement,
}: {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
  onDismiss: (id: string) => void;
  variant: 'success' | 'milestone' | 'default';
  placement: 'top' | 'bottom';
}) {
  const isSuccess = variant === 'success';
  const isMilestone = variant === 'milestone';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm shadow-md border',
        'animate-in fade-in duration-200 motion-reduce:animate-none',
        placement === 'top' ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2',
        isSuccess && 'bg-success-50 border-success-200 text-gray-900',
        isMilestone && 'bg-white border-primary-200 text-navy-900',
        !isSuccess && !isMilestone && 'text-white',
        !isSuccess && !isMilestone && type === 'error' && 'bg-error-600 border-error-600',
        !isSuccess && !isMilestone && type === 'info' && 'bg-primary-600 border-primary-600',
      )}
    >
      {isSuccess && (
        <span
          className="shrink-0 w-6 h-6 rounded-full bg-success-100 text-success-700 flex items-center justify-center"
          aria-hidden
        >
          <Check className="w-3.5 h-3.5" />
        </span>
      )}
      {isMilestone && (
        <span
          className="shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold"
          aria-hidden
        >
          🚚
        </span>
      )}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="leading-snug whitespace-pre-line">{message}</span>
        {action && (
          <>
            <span aria-hidden className={isSuccess || isMilestone ? 'text-gray-400' : undefined}>
              —
            </span>
            <button
              type="button"
              onClick={() => {
                action.onClick();
                onDismiss(id);
              }}
              className={cn(
                'font-semibold underline underline-offset-2 shrink-0 hover:opacity-90',
                (isSuccess || isMilestone) && 'text-primary-700',
              )}
            >
              {action.label}
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="إغلاق"
        className={cn(
          'shrink-0 rounded-lg p-1 hover:opacity-80 focus:outline-none focus-visible:ring-2',
          isSuccess && 'text-gray-500 focus-visible:ring-success-300',
          isMilestone && 'text-gray-500 focus-visible:ring-primary-300',
          !isSuccess && !isMilestone && 'text-white/90 focus-visible:ring-white/50',
        )}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function resolveVariant(
  type: 'success' | 'error' | 'info',
  placement: 'top' | 'bottom',
): 'success' | 'milestone' | 'default' {
  if (type === 'success') return 'success';
  if (type === 'info' && placement === 'top') return 'milestone';
  return 'default';
}

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  const topToasts = toasts.filter((t) => t.placement === 'top');
  const bottomToasts = toasts.filter((t) => t.placement === 'bottom');

  return (
    <>
      <div
        className={cn(
          'fixed z-[100] flex flex-col gap-2 pointer-events-none',
          'top-[calc(env(safe-area-inset-top,0px)+4.25rem)] md:top-5',
          'left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px]',
        )}
      >
        {topToasts.map((t) => (
          <ToastItem
            key={t.id}
            id={t.id}
            message={t.message}
            type={t.type}
            action={t.action}
            onDismiss={dismiss}
            placement="top"
            variant={resolveVariant(t.type, t.placement)}
          />
        ))}
      </div>

      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-[100] flex flex-col gap-2 pointer-events-none md:max-w-[400px] md:w-[calc(100%-2rem)]">
        {bottomToasts.map((t) => (
          <ToastItem
            key={t.id}
            id={t.id}
            message={t.message}
            type={t.type}
            action={t.action}
            onDismiss={dismiss}
            placement="bottom"
            variant={resolveVariant(t.type, t.placement)}
          />
        ))}
      </div>
    </>
  );
}
