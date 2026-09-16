'use client';

import { useState } from 'react';
import { ArrowUpDown, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CATEGORY_SORT_LABELS,
  type CategoryFilterState,
  type CategorySortOption,
  hasActiveCategoryFilters,
} from '@/lib/category-product-filters';

interface CategoryFilterSortBarProps {
  sort: CategorySortOption;
  filters: CategoryFilterState;
  onSortChange: (sort: CategorySortOption) => void;
  onFiltersChange: (filters: CategoryFilterState) => void;
  showRelevanceSort: boolean;
  showFreeDeliveryFilter: boolean;
}

export function CategoryFilterSortBar({
  sort,
  filters,
  onSortChange,
  onFiltersChange,
  showRelevanceSort,
  showFreeDeliveryFilter,
}: CategoryFilterSortBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const sortOptions = (Object.keys(CATEGORY_SORT_LABELS) as CategorySortOption[]).filter(
    (key) => key !== 'relevance' || showRelevanceSort,
  );

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border text-sm font-medium transition-colors',
            hasActiveCategoryFilters(filters)
              ? 'border-primary-300 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
          )}
          aria-label="فلترة"
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden />
          <span>⚙ فلترة</span>
        </button>

        <button
          type="button"
          onClick={() => setSortOpen(true)}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="ترتيب"
        >
          <ArrowUpDown className="w-4 h-4" aria-hidden />
          <span>↕ ترتيب</span>
        </button>
      </div>

      {filterOpen && (
        <FilterSheet
          filters={filters}
          showFreeDeliveryFilter={showFreeDeliveryFilter}
          onApply={onFiltersChange}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {sortOpen && (
        <SortSheet
          sort={sort}
          options={sortOptions}
          onSelect={(value) => {
            onSortChange(value);
            setSortOpen(false);
          }}
          onClose={() => setSortOpen(false)}
        />
      )}
    </>
  );
}

function FilterSheet({
  filters,
  showFreeDeliveryFilter,
  onApply,
  onClose,
}: {
  filters: CategoryFilterState;
  showFreeDeliveryFilter: boolean;
  onApply: (filters: CategoryFilterState) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CategoryFilterState>(filters);

  return (
    <SheetOverlay onClose={onClose} title="فلترة">
      <div className="space-y-4">
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={draft.offersOnly}
            onChange={(e) => setDraft((d) => ({ ...d, offersOnly: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-primary-500"
          />
          <span className="text-sm text-gray-800">عروض وتخفيضات</span>
        </label>

        {showFreeDeliveryFilter && (
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={draft.freeDeliveryHelper}
              onChange={(e) =>
                setDraft((d) => ({ ...d, freeDeliveryHelper: e.target.checked }))
              }
              className="w-4 h-4 rounded border-gray-300 text-primary-500"
            />
            <span className="text-sm text-gray-800">🚚 يساعدني على التوصيل المجاني</span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">السعر من</span>
            <input
              type="number"
              min={0}
              value={draft.priceMin ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  priceMin: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm"
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 mb-1 block">السعر إلى</span>
            <input
              type="number"
              min={0}
              value={draft.priceMax ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  priceMax: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm"
              placeholder="∞"
            />
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              onApply({ offersOnly: false, freeDeliveryHelper: false });
              onClose();
            }}
            className="flex-1 min-h-[44px] rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-primary-500 text-gray-900 text-sm font-semibold hover:bg-primary-600"
          >
            تطبيق
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}

function SortSheet({
  sort,
  options,
  onSelect,
  onClose,
}: {
  sort: CategorySortOption;
  options: CategorySortOption[];
  onSelect: (sort: CategorySortOption) => void;
  onClose: () => void;
}) {
  return (
    <SheetOverlay onClose={onClose} title="ترتيب">
      <div className="space-y-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              'w-full min-h-[44px] px-3 rounded-xl text-sm text-right transition-colors',
              sort === option
                ? 'bg-primary-50 text-primary-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            {CATEGORY_SORT_LABELS[option]}
          </button>
        ))}
      </div>
    </SheetOverlay>
  );
}

function SheetOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-t-2xl md:rounded-2xl p-4 pb-6 safe-area-bottom">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
