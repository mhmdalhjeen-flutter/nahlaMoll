'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useCartMap } from '@/hooks/useCartMap';
import { cn } from '@/lib/utils';
import { CategoryNav } from '@/components/home/CategoryNav';
import { FreeDeliveryModals } from '@/components/home/FreeDeliveryModals';
import { ScooterProgress } from '@/components/home/ScooterProgress';
import { useFreeDeliveryProgress } from '@/components/home/useFreeDeliveryProgress';
import type { Category } from '@/lib/types';

const HEADER_OFFSET_PX = 56; // h-14 store header

interface HomeBrowseHeaderProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  loading?: boolean;
}

function CompactLinkButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-primary-200/80 bg-white px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-primary-700 hover:bg-primary-50 hover:border-primary-300 active:scale-95 transition-all touch-manipulation whitespace-nowrap"
    >
      {children}
    </button>
  );
}

export function HomeBrowseHeader({
  categories,
  selectedId,
  onSelect,
  loading,
}: HomeBrowseHeaderProps) {
  const [howModalOpen, setHowModalOpen] = useState(false);
  const [areasModalOpen, setAreasModalOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const expandedRef = useRef<HTMLDivElement>(null);

  const { summary: cartSummary } = useCartMap();
  const { target, displayed, achieved, pct } = useFreeDeliveryProgress(cartSummary);

  const { data: deliveryAreas, isLoading: areasLoading } = useQuery({
    queryKey: ['delivery-areas'],
    queryFn: storeApi.getDeliveryAreas,
    enabled: areasModalOpen,
    staleTime: 5 * 60 * 1000,
  });

  const activeAreas = (deliveryAreas ?? []).filter((a) => a.isActive);

  useEffect(() => {
    const target = expandedRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: `-${HEADER_OFFSET_PX}px 0px 0px 0px`,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading]);

  return (
    <>
      {/* Expanded section — scrolls away naturally */}
      <div ref={expandedRef} className="container mx-auto px-4 pt-1 pb-2 max-w-6xl">
        <div
          className={cn(
            'rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3',
            achieved
              ? 'bg-gradient-to-l from-success-50/90 to-white border-success-200'
              : 'bg-white border-primary-100 shadow-card',
          )}
        >
          <ScooterProgress
            displayed={displayed}
            target={target}
            achieved={achieved}
            pct={pct}
            className="mb-1.5"
          />
          <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">
            {achieved
              ? 'مبارك! لقد حصلت على التوصيل المجاني 🎉'
              : 'اجمع 95% من مساهمة المنتجات للحصول على توصيل مجاني'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <CompactLinkButton onClick={() => setHowModalOpen(true)}>
              كيف أحصل على توصيل مجاني
            </CompactLinkButton>
            <CompactLinkButton onClick={() => setAreasModalOpen(true)}>
              المناطق المجانية
            </CompactLinkButton>
          </div>
        </div>
      </div>

      {/* Sticky browse bar: compact scooters + categories */}
      <div
        className={cn(
          'sticky z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-shadow duration-300',
          isSticky && 'shadow-sm',
        )}
        style={{ top: HEADER_OFFSET_PX }}
      >
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-out',
            isSticky ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="container mx-auto px-4 max-w-6xl pt-1 pb-0.5">
            <ScooterProgress
              displayed={displayed}
              target={target}
              achieved={achieved}
              pct={pct}
              compact
            />
          </div>
        </div>

        <CategoryNav
          categories={categories}
          selectedId={selectedId}
          onSelect={onSelect}
          loading={loading}
          embedded
        />
      </div>

      <FreeDeliveryModals
        howOpen={howModalOpen}
        onHowClose={() => setHowModalOpen(false)}
        areasOpen={areasModalOpen}
        onAreasClose={() => setAreasModalOpen(false)}
        areas={activeAreas}
        areasLoading={areasLoading}
      />
    </>
  );
}
