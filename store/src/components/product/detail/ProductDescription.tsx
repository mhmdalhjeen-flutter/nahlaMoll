'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const COLLAPSE_THRESHOLD = 180;

interface ProductDescriptionProps {
  description: string;
}

export function ProductDescription({ description }: ProductDescriptionProps) {
  const trimmed = description?.trim() ?? '';
  const [expanded, setExpanded] = useState(false);

  const needsCollapse = trimmed.length > COLLAPSE_THRESHOLD;
  const preview = useMemo(() => {
    if (!needsCollapse || expanded) return trimmed;
    return `${trimmed.slice(0, COLLAPSE_THRESHOLD).trim()}…`;
  }, [trimmed, needsCollapse, expanded]);

  if (!trimmed) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">عن المنتج</h2>
      <p className={cn('text-sm text-gray-600 leading-relaxed whitespace-pre-line', !expanded && needsCollapse && 'line-clamp-6')}>
        {preview}
      </p>
      {needsCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700 min-h-11 px-1 touch-manipulation"
        >
          {expanded ? 'عرض أقل' : 'عرض المزيد'}
        </button>
      )}
    </section>
  );
}
