'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssistantChat } from './AssistantChat';

interface ChatbotPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatbotPanel({ open, onClose }: ChatbotPanelProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] md:bg-black/20"
        aria-label="إغلاق المساعد"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="اسأل نحلة مول"
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-2xl border border-gray-100 overflow-hidden',
          'motion-reduce:transition-none transition-all duration-300 ease-out',
          'max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-3xl max-md:max-h-[min(88vh,720px)]',
          'max-md:animate-in max-md:fade-in max-md:slide-in-from-bottom-4 max-md:duration-300',
          'md:bottom-24 md:right-6 md:w-[min(400px,calc(100vw-2rem))]',
          'md:h-[min(560px,calc(100vh-7rem))] md:rounded-2xl',
          'md:animate-in md:fade-in md:slide-in-from-bottom-2 md:duration-200',
        )}
      >
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 leading-tight">اسأل نحلة مول</p>
            <p className="text-xs text-gray-500 mt-0.5">مساعد المتجر</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <AssistantChat />
      </section>
    </>
  );
}
