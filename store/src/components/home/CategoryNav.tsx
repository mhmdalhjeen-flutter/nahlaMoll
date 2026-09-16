'use client';

import Image from 'next/image';
import { Grid3X3 } from 'lucide-react';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-url';

const CHIP_WIDTH = 'w-[52px]';
const ICON_SIZE = 'w-12 h-12';

interface CategoryNavProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  loading?: boolean;
  embedded?: boolean;
}

export function CategoryNav({
  categories,
  selectedId,
  onSelect,
  loading,
  embedded,
}: CategoryNavProps) {
  const rootCategories = categories.filter((c) => !c.parentId).slice(0, 12);

  const Wrapper = embedded ? 'div' : 'section';
  const wrapperClass = cn(
    'container mx-auto px-4 max-w-6xl',
    embedded ? 'py-1.5 md:py-2' : 'py-2 md:py-3',
  );

  if (loading) {
    return (
      <Wrapper className={wrapperClass}>
        {/* Mobile skeleton */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 md:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn('shrink-0 space-y-1.5', CHIP_WIDTH)}>
              <div className={cn('skeleton rounded-xl', ICON_SIZE)} />
              <div className="skeleton h-2.5 w-10 mx-auto" />
            </div>
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-20 rounded-lg" />
          ))}
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper className={wrapperClass}>
      {/* Mobile: image chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1 md:hidden">
        <CategoryChip
          label="الكل"
          active={selectedId === null}
          onClick={() => onSelect(null)}
          icon={<Grid3X3 className="w-4 h-4" />}
        />
        {rootCategories.map((cat) => (
          <CategoryChip
            key={cat.id}
            label={cat.name}
            image={cat.image}
            active={selectedId === cat.id}
            onClick={() => onSelect(cat.id)}
          />
        ))}
      </div>

      {/* Desktop: compact text tabs */}
      <div
        className="hidden md:flex flex-wrap items-center gap-1.5"
        role="tablist"
        aria-label="تصفية حسب التصنيف"
      >
        <CategoryTab label="الكل" active={selectedId === null} onClick={() => onSelect(null)} />
        {rootCategories.map((cat) => (
          <CategoryTab
            key={cat.id}
            label={cat.name}
            active={selectedId === cat.id}
            onClick={() => onSelect(cat.id)}
          />
        ))}
      </div>
    </Wrapper>
  );
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-100',
        active
          ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent',
      )}
    >
      {label}
    </button>
  );
}

function CategoryChip({
  label,
  image,
  icon,
  active,
  onClick,
}: {
  label: string;
  image?: string | null;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 flex flex-col items-center gap-1 transition-colors duration-200 active:scale-95 min-h-[44px]',
        CHIP_WIDTH,
      )}
    >
      <div
        className={cn(
          'relative rounded-xl overflow-hidden border-2 transition-all duration-200',
          ICON_SIZE,
          active
            ? 'border-primary-500 ring-2 ring-primary-100 bg-primary-50'
            : 'border-gray-100 bg-gray-50 hover:border-primary-200',
        )}
      >
        {image ? (
          <Image src={getOptimizedImageUrl(image, 'thumbnail')} alt={label} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary-400 bg-primary-50">
            {icon ?? (
              <span className="text-sm font-bold text-primary-600">{label.charAt(0)}</span>
            )}
          </div>
        )}
      </div>
      <span
        className={cn(
          'text-[10px] sm:text-xs font-medium text-center line-clamp-2 leading-tight max-w-[52px]',
          active ? 'text-primary-700 font-semibold' : 'text-gray-600',
        )}
      >
        {label}
      </span>
    </button>
  );
}
