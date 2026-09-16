'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Search } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import type { DeliveryArea } from '@/lib/types';
import {
  buildDeliveryAreaSearchContext,
  filterAreasByRegion,
  findDeliveryAreaGroupForSelection,
  groupDeliveryAreasForCustomer,
  resolveMainAreaRegion,
} from '@/lib/delivery-areas';
import {
  DELIVERY_REGIONS,
  type DeliveryRegion,
  deliveryRegionLabel,
} from '@/lib/delivery-regions';

export interface DeliveryAreaNavigatorProps {
  areas: DeliveryArea[];
  selectedAreaId: string | null;
  onSelectArea: (id: string) => void;
  listMaxHeightClass?: string;
  className?: string;
}

export function DeliveryAreaNavigator({
  areas,
  selectedAreaId,
  onSelectArea,
  listMaxHeightClass = 'max-h-56',
  className,
}: DeliveryAreaNavigatorProps) {
  const activeAreas = useMemo(() => areas.filter((a) => a.isActive), [areas]);
  const skipAutoDrillRef = useRef(false);

  const initialRegion = useMemo(() => {
    const fallback = DELIVERY_REGIONS[0]?.id ?? 'GAZA';
    if (!selectedAreaId) return fallback;
    const selected = activeAreas.find((a) => a.id === selectedAreaId);
    if (!selected) return fallback;
    return resolveMainAreaRegion(selected, activeAreas) ?? fallback;
  }, [activeAreas, selectedAreaId]);

  const [activeRegion, setActiveRegion] = useState<DeliveryRegion>(initialRegion);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchContext, setSearchContext] = useState<
    ReturnType<typeof buildDeliveryAreaSearchContext>
  >(null);

  const regionAreas = useMemo(
    () => filterAreasByRegion(activeAreas, activeRegion),
    [activeAreas, activeRegion],
  );
  const groups = useMemo(
    () => groupDeliveryAreasForCustomer(regionAreas),
    [regionAreas],
  );

  useEffect(() => {
    if (skipAutoDrillRef.current) {
      skipAutoDrillRef.current = false;
      return;
    }
    const group = findDeliveryAreaGroupForSelection(groups, selectedAreaId);
    if (group && group.children.length > 0) {
      setActiveParentId(group.main.id);
    }
  }, [selectedAreaId, groups]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchContext(null);
      return;
    }
    const ctx = buildDeliveryAreaSearchContext(activeAreas, searchQuery);
    setSearchContext(ctx);
    if (ctx?.region) {
      setActiveRegion(ctx.region);
      if (ctx.group && ctx.group.children.length > 0) {
        setActiveParentId(ctx.group.main.id);
      } else {
        setActiveParentId(null);
      }
    }
  }, [searchQuery, activeAreas]);

  const handleBackToTop = () => {
    skipAutoDrillRef.current = true;
    setActiveParentId(null);
    setSearchContext(null);
    setSearchQuery('');
  };

  const handleRegionChange = (region: DeliveryRegion) => {
    setActiveRegion(region);
    setActiveParentId(null);
    setSearchContext(null);
    setSearchQuery('');
  };

  const activeGroup = activeParentId
    ? groups.find((g) => g.main.id === activeParentId)
    : null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-0.5 px-0.5">
        {DELIVERY_REGIONS.map(({ id, label }) => {
          const active = activeRegion === id;
          const hasAreas = filterAreasByRegion(activeAreas, id).length > 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleRegionChange(id)}
              className={cn(
                'shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors touch-manipulation min-h-[40px]',
                active
                  ? 'bg-navy-800 text-white shadow-sm'
                  : 'bg-gray-100 text-navy-700 hover:bg-gray-200',
                !hasAreas && !active && 'opacity-60',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن منطقتك"
          aria-label="ابحث عن منطقتك"
          className="header-search-field min-h-[44px] pr-10 pl-3 text-sm"
        />
      </div>

      {searchContext && (
        <SearchContextPanel
          context={searchContext}
          selectedAreaId={selectedAreaId}
          onSelectArea={onSelectArea}
        />
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          لا توجد مناطق في {deliveryRegionLabel(activeRegion)} حالياً
        </p>
      ) : activeGroup && activeGroup.children.length > 0 ? (
        <div className={cn('flex flex-col min-h-0', listMaxHeightClass)}>
          <button
            type="button"
            onClick={handleBackToTop}
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 min-h-[44px] px-1 rounded-lg hover:bg-navy-50"
          >
            <ArrowRight className="w-4 h-4" aria-hidden />
            رجوع
          </button>
          <div className="shrink-0 px-0.5 pb-2">
            <p className="text-sm font-semibold text-navy-900">اختر المنطقة الأقرب لك</p>
            <p className="text-xs text-gray-500 mt-0.5">مناطق {activeGroup.main.name}</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
            <AreaOptionButton
              area={activeGroup.main}
              selected={selectedAreaId === activeGroup.main.id}
              onSelect={onSelectArea}
            />
            {activeGroup.children.map((area) => (
              <AreaOptionButton
                key={area.id}
                area={area}
                selected={selectedAreaId === area.id}
                onSelect={onSelectArea}
                indented
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={cn('overflow-y-auto space-y-1.5 pr-0.5', listMaxHeightClass)}>
          {groups.map(({ main, children }) =>
            children.length > 0 ? (
              <ParentNavigateButton
                key={main.id}
                area={main}
                selected={selectedAreaId === main.id}
                onOpen={() => setActiveParentId(main.id)}
              />
            ) : (
              <AreaOptionButton
                key={main.id}
                area={main}
                selected={selectedAreaId === main.id}
                onSelect={onSelectArea}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function SearchContextPanel({
  context,
  selectedAreaId,
  onSelectArea,
}: {
  context: NonNullable<ReturnType<typeof buildDeliveryAreaSearchContext>>;
  selectedAreaId: string | null;
  onSelectArea: (id: string) => void;
}) {
  const { match, parent, siblings, region } = context;

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-3 space-y-2">
      <p className="text-xs font-semibold text-navy-700">
        {region ? deliveryRegionLabel(region) : 'نتيجة البحث'}
      </p>
      {parent && parent.id !== match.id && (
        <p className="text-xs text-gray-500 text-center">
          ↑ {parent.name}
        </p>
      )}
      <AreaOptionButton
        area={match}
        selected={selectedAreaId === match.id}
        onSelect={onSelectArea}
        highlighted
      />
      {siblings.length > 1 && (
        <div className="space-y-1 pt-1 border-t border-primary-100">
          <p className="text-[11px] text-gray-500 px-1">مناطق قريبة</p>
          {siblings
            .filter((a) => a.id !== match.id)
            .map((area) => (
              <AreaOptionButton
                key={area.id}
                area={area}
                selected={selectedAreaId === area.id}
                onSelect={onSelectArea}
                compact
              />
            ))}
        </div>
      )}
    </div>
  );
}

function ParentNavigateButton({
  area,
  onOpen,
  selected,
}: {
  area: DeliveryArea;
  onOpen: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full text-right rounded-xl border px-3 py-3 min-h-[48px] transition-colors touch-manipulation',
        selected
          ? 'border-primary-300 bg-primary-50/60'
          : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-50/30',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <ChevronLeft className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-gray-900 block">{area.name}</span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">
            رسوم التوصيل من {formatPrice(area.deliveryFee)} ₪
          </span>
        </div>
        {selected && (
          <Check className="w-4 h-4 text-success-600 shrink-0" aria-hidden />
        )}
      </div>
    </button>
  );
}

function AreaOptionButton({
  area,
  selected,
  onSelect,
  indented = false,
  highlighted = false,
  compact = false,
}: {
  area: DeliveryArea;
  selected: boolean;
  onSelect: (id: string) => void;
  indented?: boolean;
  highlighted?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(area.id)}
      className={cn(
        'w-full text-right rounded-xl border transition-colors touch-manipulation',
        compact ? 'px-2.5 py-2 min-h-[44px]' : 'px-3 py-3 min-h-[48px]',
        indented && 'mr-2',
        highlighted && 'ring-2 ring-primary-300/80',
        selected
          ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
          : 'border-gray-200 bg-white hover:border-primary-200',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm text-gray-900">{area.name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selected && (
            <span className="text-[10px] font-bold text-success-700 flex items-center gap-0.5">
              <Check className="w-3.5 h-3.5" aria-hidden />
              تم الاختيار
            </span>
          )}
          <span className="text-xs text-gray-500 tabular-nums">
            {formatPrice(area.deliveryFee)} ₪
          </span>
        </div>
      </div>
      {area.eligibleForFreeDelivery && !compact && (
        <span className="text-[11px] text-success-700 mt-0.5 inline-block">
          مؤهلة للتوصيل المجاني
        </span>
      )}
    </button>
  );
}
