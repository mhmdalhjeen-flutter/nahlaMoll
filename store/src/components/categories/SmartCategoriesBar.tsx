'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LayoutGrid, Sparkles } from 'lucide-react';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { recordCustomerEvent } from '@/lib/customer-events';
import { getOptimizedImageUrl } from '@/lib/image-url';
import {
  getSmartCategories,
  SMART_CATEGORY_MOBILE_VISIBLE,
  type CategoryAffinityMaps,
} from '@/lib/smart-categories';

const MOBILE_HEADER_OFFSET_PX = 56;

/** Mobile compact chip sizing */
const MOBILE_CHIP_WIDTH = 'w-[60px]';
const MOBILE_ICON_SIZE = 'w-10 h-10';

/** Desktop chip sizing */
const DESKTOP_CHIP_WIDTH = 'w-[72px]';
const DESKTOP_ICON_SIZE = 'w-[50px] h-[50px]';

interface SmartCategoriesBarProps {
  categories: Category[];
  activeSlug: string | null;
  affinityMaps?: CategoryAffinityMaps;
  loading?: boolean;
}

export function SmartCategoriesBar({
  categories,
  activeSlug,
  affinityMaps,
  loading,
}: SmartCategoriesBarProps) {
  const smartCategories = getSmartCategories(categories, affinityMaps);
  const mobileCategories = smartCategories.slice(0, SMART_CATEGORY_MOBILE_VISIBLE);

  const trackCategoryClick = (cat: Category) => {
    recordCustomerEvent({
      type: 'CATEGORY_CLICKED',
      categoryId: cat.id,
      context: cat.slug,
      source: 'category',
    });
  };

  if (loading) {
    return (
      <div
        className="sticky z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 md:static md:bg-white"
        style={{ top: MOBILE_HEADER_OFFSET_PX }}
      >
        <div className="container mx-auto px-4 max-w-6xl py-1.5 md:py-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn('shrink-0 space-y-1', MOBILE_CHIP_WIDTH)}>
                <div className={cn('skeleton rounded-xl', MOBILE_ICON_SIZE)} />
                <div className="skeleton h-2.5 w-10 mx-auto rounded" />
              </div>
            ))}
          </div>
          <div className="hidden md:flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn('shrink-0 space-y-1.5', DESKTOP_CHIP_WIDTH)}>
                <div className={cn('skeleton rounded-2xl', DESKTOP_ICON_SIZE)} />
                <div className="skeleton h-3 w-12 mx-auto rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="sticky z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 md:static md:bg-white"
      style={{ top: MOBILE_HEADER_OFFSET_PX }}
    >
      <div
        className="container mx-auto px-4 max-w-6xl py-1.5 md:py-2"
        role="tablist"
        aria-label="تصفح الأقسام"
      >
        {/* Mobile: scrollable categories + fixed كل الأقسام on the left (RTL end) */}
        <div className="flex items-stretch md:hidden min-h-[44px]">
          <div className="relative flex-1 min-w-0">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 pe-1">
              <SmartCategoryChip
                href="/categories"
                label="الكل"
                icon={<Sparkles className="w-4 h-4" aria-hidden />}
                active={activeSlug === null}
                compact
              />
              {mobileCategories.map((cat) => (
                <SmartCategoryChip
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  label={cat.name}
                  image={cat.image}
                  active={activeSlug === cat.slug}
                  compact
                  onNavigate={() => trackCategoryClick(cat)}
                />
              ))}
            </div>
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-l from-white via-white/80 to-transparent"
              aria-hidden
            />
          </div>

          <div
            className={cn(
              'shrink-0 flex items-start border-r border-gray-200 bg-white ps-2 pe-0',
              'shadow-[4px_0_10px_-4px_rgba(0,0,0,0.08)]',
            )}
          >
            <SmartCategoryChip
              href="/categories/all"
              label="كل الأقسام"
              icon={<LayoutGrid className="w-4 h-4" aria-hidden />}
              active={activeSlug === 'all'}
              compact
              fixedEnd
            />
          </div>
        </div>

        {/* Desktop: full horizontal scroll */}
        <div className="hidden md:flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
          <SmartCategoryChip
            href="/categories"
            label="الكل"
            icon={<Sparkles className="w-5 h-5" aria-hidden />}
            active={activeSlug === null}
          />
          {smartCategories.map((cat) => (
            <SmartCategoryChip
              key={cat.id}
              href={`/categories/${cat.slug}`}
              label={cat.name}
              image={cat.image}
              active={activeSlug === cat.slug}
              onNavigate={() => trackCategoryClick(cat)}
            />
          ))}
          <SmartCategoryChip
            href="/categories/all"
            label="كل الأقسام"
            icon={<LayoutGrid className="w-5 h-5" aria-hidden />}
            active={activeSlug === 'all'}
          />
        </div>
      </div>
    </div>
  );
}

function SmartCategoryChip({
  href,
  label,
  image,
  icon,
  active,
  compact,
  fixedEnd,
  onNavigate,
}: {
  href: string;
  label: string;
  image?: string | null;
  icon?: React.ReactNode;
  active: boolean;
  compact?: boolean;
  fixedEnd?: boolean;
  onNavigate?: () => void;
}) {
  const chipWidth = compact ? MOBILE_CHIP_WIDTH : DESKTOP_CHIP_WIDTH;
  const iconSize = compact ? MOBILE_ICON_SIZE : DESKTOP_ICON_SIZE;

  const displayLabel =
    label === 'الكل' ? '✨ الكل' : label === 'كل الأقسام' ? '▦ كل الأقسام' : label;

  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      onClick={() => onNavigate?.()}
      className={cn(
        'shrink-0 flex flex-col items-center transition-all duration-200 min-h-[44px]',
        'active:scale-[0.97]',
        compact ? 'gap-1' : 'gap-1.5',
        chipWidth,
        fixedEnd && 'pt-0.5',
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden border-2 transition-all duration-200',
          iconSize,
          compact ? 'rounded-xl' : 'rounded-2xl',
          active
            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
            : 'border-gray-100 bg-gray-50 hover:border-primary-200',
        )}
      >
        {image ? (
          <Image
            src={getOptimizedImageUrl(image, 'thumbnail')}
            alt=""
            fill
            className={cn('object-cover transition-opacity duration-200', active && 'opacity-95')}
            sizes={compact ? '40px' : '52px'}
          />
        ) : (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              active ? 'text-primary-600 bg-primary-50' : 'text-primary-400 bg-gray-50',
            )}
          >
            {icon ?? (
              <span className={cn('font-bold text-primary-600', compact ? 'text-xs' : 'text-sm')}>
                {label.charAt(0)}
              </span>
            )}
          </div>
        )}
      </div>
      <span
        className={cn(
          'leading-tight text-center line-clamp-2',
          compact ? 'text-[10px] max-w-[60px]' : 'text-[11px] max-w-[72px]',
          active ? 'text-primary-700 font-semibold' : 'text-gray-600 font-medium',
        )}
      >
        {displayLabel}
      </span>
    </Link>
  );
}
