'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${sizeClass} max-h-[92vh] overflow-hidden bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-200 min-w-0`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden p-4 sm:p-5 min-w-0">{children}</div>
      </div>
    </div>
  );
}
