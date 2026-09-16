'use client';

import { LayoutGrid } from 'lucide-react';
import type { CategoryTabItem } from '@/lib/category-tabs';

interface ProductCategoryTabsProps {
  selectedId: string | null;
  allCount: number;
  categories: CategoryTabItem[];
  loading?: boolean;
  onSelect: (categoryId: string | null) => void;
}

export function ProductCategoryTabs({
  selectedId,
  allCount,
  categories,
  loading,
  onSelect,
}: ProductCategoryTabsProps) {
  const isAll = selectedId === null;

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => onSelect(null)}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 min-h-[44px] text-sm font-semibold transition-all w-full sm:w-auto sm:shrink-0 ${
            isAll
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300 hover:bg-primary-50'
          }`}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>الكل</span>
          <CountBadge active={isAll} count={allCount} />
        </button>

        {categories.map((cat) => {
          const active = selectedId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              disabled={loading}
              onClick={() => onSelect(cat.id)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 min-h-[44px] text-sm font-semibold transition-all w-full sm:w-auto sm:shrink-0 min-w-0 ${
                active
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              {cat.depth === 1 && (
                <span className={`text-xs shrink-0 ${active ? 'text-white/80' : 'text-gray-400'}`}>
                  ↳
                </span>
              )}
              <span className={`truncate ${cat.depth === 1 ? 'text-[13px]' : ''}`}>{cat.name}</span>
              <CountBadge active={active} count={cat.productCount} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CountBadge({ active, count }: { active: boolean; count: number }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold min-w-[1.5rem] text-center shrink-0 ${
        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {count}
    </span>
  );
}
