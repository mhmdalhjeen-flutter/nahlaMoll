'use client';

import type { Category } from '@/lib/types';
import { CategoryNav } from '@/components/home/CategoryNav';
import { cn } from '@/lib/utils';

const MOBILE_HEADER_OFFSET_PX = 56;

interface HomeCategoryBarProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  loading?: boolean;
}

/** Category discovery — sticky on mobile, static on desktop. */
export function HomeCategoryBar({
  categories,
  selectedId,
  onSelect,
  loading,
}: HomeCategoryBarProps) {
  return (
    <div
      className={cn(
        'sticky z-20 bg-white/95 backdrop-blur-md border-b border-gray-100',
        'md:static md:bg-white md:backdrop-blur-none',
      )}
      style={{ top: MOBILE_HEADER_OFFSET_PX }}
    >
      <CategoryNav
        categories={categories}
        selectedId={selectedId}
        onSelect={onSelect}
        loading={loading}
        embedded
      />
    </div>
  );
}
