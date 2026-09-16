'use client';

import { Switch } from '@/components/ui/Switch';
import {
  DEFAULT_DND_FROM,
  DEFAULT_DND_UNTIL,
  formatTime12hAr,
} from '@/lib/notification-preferences';
import { cn } from '@/lib/utils';

interface DoNotDisturbSectionProps {
  enabled: boolean;
  from: string;
  until: string;
  disabled?: boolean;
  saving?: boolean;
  schedulingSupported: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onFromChange: (value: string) => void;
  onUntilChange: (value: string) => void;
}

function toTimeInputValue(hhmm: string): string {
  return hhmm.length >= 5 ? hhmm.slice(0, 5) : hhmm;
}

export function DoNotDisturbSection({
  enabled,
  from,
  until,
  disabled,
  saving,
  schedulingSupported,
  onEnabledChange,
  onFromChange,
  onUntilChange,
}: DoNotDisturbSectionProps) {
  const fromValue = from || DEFAULT_DND_FROM;
  const untilValue = until || DEFAULT_DND_UNTIL;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <Switch
        id="dnd-enabled"
        label="عدم الإزعاج"
        description="أوقات هادئة — الإشعارات غير العاجلة تُؤجَّل حسب تفضيلك."
        checked={enabled}
        disabled={disabled || saving}
        onChange={onEnabledChange}
      />

      {enabled && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <TimeField
            id="dnd-from"
            label="من"
            value={fromValue}
            disabled={disabled || saving}
            onChange={onFromChange}
          />
          <TimeField
            id="dnd-until"
            label="إلى"
            value={untilValue}
            disabled={disabled || saving}
            onChange={onUntilChange}
          />
        </div>
      )}

      {enabled && (
        <p className="text-xs text-gray-500 leading-relaxed">
          {formatTime12hAr(fromValue)} — {formatTime12hAr(untilValue)}
        </p>
      )}

      {!schedulingSupported && (
        <p className="text-xs text-amber-800/90 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
          تفضيلات عدم الإزعاج محفوظة. تطبيقها على وقت الإرسال يتطلّب محرك توصيل إشعارات — قيد
          التجهيز. تحديثات الطلبات العاجلة قد تصل عند الضرورة.
        </p>
      )}
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="time"
        dir="ltr"
        value={toTimeInputValue(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400',
          'disabled:opacity-50',
        )}
      />
    </div>
  );
}
