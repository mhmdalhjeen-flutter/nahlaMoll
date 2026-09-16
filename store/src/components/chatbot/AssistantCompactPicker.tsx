'use client';

import type { AssistantCompactItem } from '@/lib/assistant/types';
import { cn } from '@/lib/utils';

interface AssistantCompactPickerProps {
  items: AssistantCompactItem[];
  disabled?: boolean;
  onSelect: (item: AssistantCompactItem) => void;
}

export function AssistantCompactPicker({
  items,
  disabled,
  onSelect,
}: AssistantCompactPickerProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={`${item.productId}-${item.label}`}
          type="button"
          disabled={disabled || !item.productId}
          onClick={() => onSelect(item)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-800',
            'hover:border-primary-200 hover:bg-primary-50/70 min-h-[40px] touch-manipulation',
            (disabled || !item.productId) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span aria-hidden>{item.emoji}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
