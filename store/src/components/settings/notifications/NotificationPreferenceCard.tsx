'use client';

import { cn } from '@/lib/utils';

interface NotificationPreferenceCardProps {
  emoji: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  saving?: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

export function NotificationPreferenceCard({
  emoji,
  title,
  description,
  checked,
  disabled,
  saving,
  onChange,
  id,
}: NotificationPreferenceCardProps) {
  const switchDisabled = disabled || saving;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg leading-none" aria-hidden>
              {emoji}
            </span>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </div>

        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={`${title} — ${checked ? 'مفعّل' : 'غير مفعّل'}`}
          disabled={switchDisabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 touch-manipulation mt-0.5',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'motion-reduce:transition-none',
            checked ? 'bg-primary-600' : 'bg-gray-200',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow transition duration-200',
              'motion-reduce:transition-none',
              checked ? '-translate-x-6' : 'translate-x-0',
            )}
          />
        </button>
      </div>
      {saving && (
        <p className="mt-2 text-[11px] text-gray-400" aria-live="polite">
          جارٍ الحفظ...
        </p>
      )}
    </div>
  );
}
