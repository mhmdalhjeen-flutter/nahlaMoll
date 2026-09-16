'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsHeaderProps {
  title: string;
  backHref?: string;
  className?: string;
}

export function SettingsHeader({ title, backHref, className }: SettingsHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/profile');
  };

  return (
    <header className={cn('flex items-center gap-2 mb-6', className)}>
      <button
        type="button"
        onClick={handleBack}
        className={cn(
          'shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl',
          'text-primary-700 hover:bg-primary-50 transition-colors touch-manipulation',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        )}
        aria-label="رجوع"
      >
        <ArrowRight className="w-5 h-5" aria-hidden />
      </button>
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
    </header>
  );
}
