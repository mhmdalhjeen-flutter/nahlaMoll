'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsItemLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  external?: boolean;
}

export function SettingsItemLink({
  href,
  icon: Icon,
  label,
  description,
  external,
}: SettingsItemLinkProps) {
  const content = (
    <>
      <span className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px] text-primary-600" aria-hidden />
      </span>
      <span className="flex-1 min-w-0 text-right">
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        {description && (
          <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{description}</span>
        )}
      </span>
      <ChevronLeft className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
    </>
  );

  const className = cn(
    'flex items-center gap-3 px-4 py-3 min-h-[52px] w-full',
    'hover:bg-gray-50/80 transition-colors touch-manipulation',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

interface SettingsItemButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'subtle';
}

export function SettingsItemButton({
  icon: Icon,
  label,
  description,
  onClick,
  tone = 'default',
}: SettingsItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 min-h-[52px] w-full text-right',
        'hover:bg-gray-50/80 transition-colors touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
        tone === 'subtle' && 'text-gray-600',
      )}
    >
      <span
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
          tone === 'danger' ? 'bg-error-50' : 'bg-primary-50',
        )}
      >
        <Icon
          className={cn(
            'w-[18px] h-[18px]',
            tone === 'danger' ? 'text-error-600' : 'text-primary-600',
          )}
          aria-hidden
        />
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            'block text-sm font-medium',
            tone === 'danger' ? 'text-error-700' : tone === 'subtle' ? 'text-gray-600' : 'text-gray-900',
          )}
        >
          {label}
        </span>
        {description && (
          <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{description}</span>
        )}
      </span>
    </button>
  );
}
