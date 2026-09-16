'use client';

import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyFieldProps {
  label: string;
  value: string;
  className?: string;
}

export function CopyField({ label, value, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [value]);

  return (
    <div className={cn('space-y-1', className)}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="flex items-center justify-between gap-2">
        <span
          className="font-medium text-gray-900 break-all ltr-input text-left flex-1 min-w-0"
          dir="ltr"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={copied ? 'تم النسخ' : `نسخ ${label}`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" aria-hidden />
              تم النسخ
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden />
              نسخ
            </>
          )}
        </button>
      </dd>
    </div>
  );
}
