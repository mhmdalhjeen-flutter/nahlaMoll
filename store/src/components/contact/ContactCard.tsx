'use client';

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type ContactCardAccent = 'whatsapp' | 'phone' | 'chatbot';

interface ContactCardBaseProps {
  title: string;
  description: string;
  actionLabel: string;
  accent?: ContactCardAccent;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  ariaLabel: string;
}

interface ContactCardLinkProps extends ContactCardBaseProps {
  href: string;
  external?: boolean;
  onClick?: never;
}

interface ContactCardButtonProps extends ContactCardBaseProps {
  href?: never;
  external?: never;
  onClick: () => void;
}

export type ContactCardProps = ContactCardLinkProps | ContactCardButtonProps;

const ACCENT_STYLES: Record<ContactCardAccent, { icon: string; action: string }> = {
  whatsapp: {
    icon: 'bg-[#25D366]/10 text-[#128C7E]',
    action: 'text-[#128C7E]',
  },
  phone: {
    icon: 'bg-primary-50 text-primary-700',
    action: 'text-primary-700',
  },
  chatbot: {
    icon: 'bg-primary-50 text-primary-700',
    action: 'text-primary-700',
  },
};

function ContactCardContent({
  title,
  description,
  actionLabel,
  accent = 'phone',
  icon: Icon,
}: Omit<ContactCardBaseProps, 'ariaLabel'>) {
  const styles = ACCENT_STYLES[accent];

  return (
    <>
      <span className="flex items-start justify-between gap-3 w-full">
        <span
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
            styles.icon,
          )}
        >
          <Icon className="w-5 h-5" aria-hidden />
        </span>
        <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0 mt-1" aria-hidden />
      </span>
      <span className="block mt-3 text-right w-full">
        <span className="block text-base font-bold text-gray-900 leading-snug">{title}</span>
        <span className="block text-sm text-gray-600 mt-1 leading-relaxed">{description}</span>
        <span className={cn('block text-sm font-semibold mt-3', styles.action)}>{actionLabel}</span>
      </span>
    </>
  );
}

const cardClassName = cn(
  'flex flex-col items-start w-full rounded-2xl border border-gray-100 bg-white p-4',
  'text-right transition-colors motion-reduce:transition-none',
  'hover:border-primary-100 hover:bg-gray-50/60 active:bg-gray-50',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
  'min-h-[44px] touch-manipulation',
);

export function ContactCard(props: ContactCardProps) {
  const { ariaLabel, ...contentProps } = props;

  if ('href' in props && props.href) {
    const { href, external } = props;
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        className={cardClassName}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        <ContactCardContent {...contentProps} />
      </a>
    );
  }

  return (
    <button type="button" aria-label={ariaLabel} className={cardClassName} onClick={props.onClick}>
      <ContactCardContent {...contentProps} />
    </button>
  );
}
