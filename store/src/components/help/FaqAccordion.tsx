'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqAccordionItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export function FaqAccordionItem({ question, answer, defaultOpen }: FaqAccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const panelId = useId();
  const buttonId = useId();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[48px] text-right',
          'transition-colors touch-manipulation',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
          open ? 'text-primary-700 bg-primary-50/40' : 'text-gray-900 hover:bg-gray-50/80',
        )}
      >
        <span className="text-sm font-semibold leading-snug flex-1">{question}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-180 text-primary-600',
          )}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className={cn(
          'overflow-hidden border-t border-gray-50',
          open && 'animate-in fade-in duration-200 motion-reduce:animate-none',
        )}
      >
        <p className="px-4 py-3 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {answer}
        </p>
      </div>
    </div>
  );
}

interface FaqAccordionGroupProps {
  title: string;
  emoji: string;
  children: React.ReactNode;
}

export function FaqAccordionGroup({ title, emoji, children }: FaqAccordionGroupProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-gray-900 px-1 flex items-center gap-2">
        <span aria-hidden>{emoji}</span>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
