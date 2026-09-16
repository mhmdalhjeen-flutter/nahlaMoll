'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** When false, backdrop, escape, and header close are disabled. */
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {dismissible ? (
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          onClick={onClose}
          aria-label="إغلاق"
        />
      ) : (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden />
      )}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            {title && <h2 className="text-lg font-bold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
