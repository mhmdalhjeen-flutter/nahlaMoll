'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useCartMap } from '@/hooks/useCartMap';
import { useAuthStore } from '@/stores/auth-store';
import { useFreeDeliveryExplained } from '@/hooks/useFreeDeliveryExplained';
import { cn } from '@/lib/utils';
import { buildFreeDeliveryJourneyView } from '@/lib/free-delivery-journey';
import { useFreeDeliveryProgress } from '@/components/home/useFreeDeliveryProgress';
import { FreeDeliveryJourneyContent } from './free-delivery/FreeDeliveryJourneyContent';
import { FreeDeliveryProgressBar } from './free-delivery/FreeDeliveryProgressBar';
import {
  FreeDeliveryHowItWorksModal,
  FreeDeliveryAreasModal,
} from './free-delivery/FreeDeliveryModals';
import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';
import { FREE_DELIVERY_ELIGIBILITY_THRESHOLD } from '@/lib/delivery.constants';

const MOBILE_HEADER_OFFSET_PX = 56;

interface FreeDeliveryJourneyProps {
  compact?: boolean;
  /** Fixed viewport page — no sticky scroll bar, tighter chrome. */
  embedded?: boolean;
  className?: string;
}

export function FreeDeliveryJourney({
  compact = false,
  embedded = false,
  className,
}: FreeDeliveryJourneyProps) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [howModalOpen, setHowModalOpen] = useState(false);
  const [areasModalOpen, setAreasModalOpen] = useState(false);
  const [showCompactBar, setShowCompactBar] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated } = useAuthStore();
  const { summary: cartSummary } = useCartMap();
  const { pct, achieved } = useFreeDeliveryProgress(cartSummary);
  const { hasExplained, markExplained } = useFreeDeliveryExplained();

  const areaEligible = cartSummary?.areaEligibility;
  const hasCartItems = isAuthenticated && (cartSummary?.totalItems ?? 0) > 0;
  const isEmptyCart = !isAuthenticated || !hasCartItems;
  const highProgressNotFree =
    isAuthenticated &&
    !achieved &&
    pct >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD &&
    areaEligible === false;

  const view = useMemo(
    () =>
      buildFreeDeliveryJourneyView({
        isAuthenticated,
        pct,
        achieved,
        hasExplained,
        isEmptyCart,
        highProgressNotFree,
        hasCartItems,
      }),
    [isAuthenticated, pct, achieved, hasExplained, isEmptyCart, highProgressNotFree, hasCartItems],
  );

  const { data: deliveryAreas, isLoading: areasLoading } = useQuery({
    queryKey: ['delivery-areas'],
    queryFn: storeApi.getDeliveryAreas,
    enabled: areasModalOpen,
    staleTime: 5 * 60 * 1000,
  });

  const activeAreas = (deliveryAreas ?? []).filter((a) => a.isActive);

  useEffect(() => {
    if (embedded) return;
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowCompactBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: `-${MOBILE_HEADER_OFFSET_PX}px 0px 0px 0px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [embedded]);

  const nearAchieved = pct >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD && !highProgressNotFree;

  const cardBorderClass = highProgressNotFree
    ? 'border-warning-200'
    : view.visualStage === 'green'
      ? 'border-success-200'
      : nearAchieved
        ? 'border-primary-300'
        : 'border-primary-200';

  const cardBgClass = view.visualStage === 'green' ? 'bg-primary-50' : 'bg-primary-50';

  /** Home + empty/no-progress cart only; uses existing cart summary + progress hook. */
  const showInfoActions = isHomePage && (pct === 0 || !hasCartItems);

  return (
    <>
      {!embedded && (
      <div
        className={cn(
          'md:hidden sticky z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-200',
          showCompactBar && view.showProgressBar ? 'max-h-10 opacity-100 shadow-sm' : 'max-h-0 opacity-0 overflow-hidden border-b-0',
        )}
        style={{ top: MOBILE_HEADER_OFFSET_PX }}
        aria-hidden={!showCompactBar || !view.showProgressBar}
      >
        <div className="container mx-auto px-4 max-w-6xl py-1.5 flex items-center gap-2">
          <DeliveryScooterIcon className="w-4 h-4 shrink-0" accentClassName="text-cta-600" />
          <span className="text-xs font-semibold text-gray-800 tabular-nums shrink-0 min-w-[2.5rem]">
            {Math.round(pct)}%
          </span>
          <FreeDeliveryProgressBar
            pct={pct}
            visualStage={view.visualStage}
            compact
            showLabels={false}
            className="flex-1 min-w-0"
          />
        </div>
      </div>
      )}

      <div
        ref={cardRef}
        className={cn(
          embedded
            ? 'px-2 pt-0.5 pb-1 max-w-none'
            : compact
              ? 'px-2 pt-1 pb-2 max-w-none'
              : 'container mx-auto px-4 pt-2 pb-4 md:pt-4 md:pb-6 max-w-6xl',
          className,
        )}
      >
        <div
          className={cn(
            'rounded-xl border',
            embedded ? 'p-2' : compact ? 'p-2.5 md:p-3' : 'rounded-2xl p-4 md:p-5',
            cardBgClass,
            cardBorderClass,
          )}
        >
          <div className="md:hidden">
            <FreeDeliveryJourneyContent
              view={view}
              pct={pct}
              onOpenHow={() => setHowModalOpen(true)}
              onOpenAreas={() => setAreasModalOpen(true)}
              layout="mobile"
              showInfoActions={showInfoActions}
            />
          </div>

          <div className="hidden md:block">
            <FreeDeliveryJourneyContent
              view={view}
              pct={pct}
              onOpenHow={() => setHowModalOpen(true)}
              onOpenAreas={() => setAreasModalOpen(true)}
              layout="desktop"
              showInfoActions={showInfoActions}
            />
          </div>
        </div>
      </div>

      <FreeDeliveryHowItWorksModal
        open={howModalOpen}
        onClose={() => setHowModalOpen(false)}
        onExplained={markExplained}
      />
      <FreeDeliveryAreasModal
        open={areasModalOpen}
        onClose={() => setAreasModalOpen(false)}
        areas={activeAreas}
        areasLoading={areasLoading}
      />
    </>
  );
}
