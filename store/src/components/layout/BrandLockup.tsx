'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BRAND, BRAND_ASSETS, LOGO_ICON_META } from '@/lib/branding';

interface BrandLockupProps {
  /** sm = mobile header, md = desktop */
  size?: 'sm' | 'md';
  className?: string;
  /** Header sits on navy — light text for brand name */
  onDark?: boolean;
}

/**
 * Header brand lockup: logBeeIcon.png + نحلة مول (HTML text).
 */
export function BrandLockup({ size = 'sm', className, onDark = false }: BrandLockupProps) {
  const iconHeight = size === 'sm' ? 26 : 32;
  const iconWidth = Math.round(iconHeight * LOGO_ICON_META.aspectRatio);

  return (
    <Link
      href="/"
      className={cn(
        'brand-lockup inline-flex items-center gap-1.5 shrink-0 min-w-0 max-w-full',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70',
        onDark ? 'focus-visible:ring-offset-navy-800' : 'focus-visible:ring-offset-white',
        className,
      )}
      aria-label={`${BRAND.nameAr} — الرئيسية`}
    >
      <Image
        src={BRAND_ASSETS.icon}
        alt="نحلة مول"
        width={iconWidth}
        height={iconHeight}
        priority
        className={cn(
          'object-contain object-center w-auto shrink-0',
          size === 'sm' ? 'h-[26px]' : 'h-8',
        )}
      />
      <span
        className={cn(
          'font-bold leading-none truncate',
          size === 'sm' ? 'text-sm' : 'text-base lg:text-lg',
          onDark ? 'text-white' : 'text-navy-900',
        )}
      >
        {BRAND.nameAr}
      </span>
    </Link>
  );
}
