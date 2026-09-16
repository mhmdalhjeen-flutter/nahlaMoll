'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatProgressPercent } from '@/lib/free-delivery';
import type { FreeDeliveryJourneyView } from '@/lib/free-delivery-journey';
import { FreeDeliveryProgressBar } from './FreeDeliveryProgressBar';
import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';

function JourneyActionButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs font-medium text-primary-700',
        'hover:bg-primary-50 hover:border-primary-300 transition-colors duration-200',
        'min-h-[32px] touch-manipulation whitespace-nowrap',
        'focus:outline-none focus:ring-2 focus:ring-primary-100',
        className,
      )}
    >
      {children}
    </button>
  );
}

interface FreeDeliveryJourneyContentProps {
  view: FreeDeliveryJourneyView;
  pct: number;
  onOpenHow: () => void;
  onOpenAreas: () => void;
  layout?: 'mobile' | 'desktop';
  /** Show "كيف؟" / areas links only on home with empty cart at 0% progress. */
  showInfoActions?: boolean;
}

export function FreeDeliveryJourneyContent({
  view,
  pct,
  onOpenHow,
  onOpenAreas,
  layout = 'mobile',
  showInfoActions = false,
}: FreeDeliveryJourneyContentProps) {
  const isDesktop = layout === 'desktop';
  const scooterAccent =
    view.visualStage === 'green'
      ? 'text-success-700'
      : 'text-cta-600';

  return (
    <div className={cn(isDesktop ? 'flex items-center gap-5 lg:gap-6 w-full' : 'flex gap-3 items-start')}>
      <div
        className={cn(
          'shrink-0 rounded-xl flex items-center justify-center',
          isDesktop ? 'w-12 h-12 lg:w-14 lg:h-14' : 'w-10 h-10',
          view.visualStage === 'green' ? 'bg-success-100' : 'bg-primary-100',
        )}
        aria-hidden
      >
        <DeliveryScooterIcon
          className={cn(isDesktop ? 'w-6 h-6 lg:w-7 lg:h-7' : 'w-5 h-5')}
          accentClassName={scooterAccent}
        />
      </div>

      <div className={cn('min-w-0 flex-1', isDesktop ? 'space-y-2' : 'space-y-1')}>
        <p className={cn('font-semibold text-gray-900 leading-snug', isDesktop ? 'text-sm lg:text-base' : 'text-sm')}>
          {view.headline}
        </p>

        {view.subline && (
          <p className={cn('text-gray-600 leading-snug', isDesktop ? 'text-sm' : 'text-xs sm:text-sm')}>
            {view.subline}
          </p>
        )}

        {view.showProgressBar && (
          <FreeDeliveryProgressBar
            pct={pct}
            visualStage={view.visualStage}
            label={view.progressLabel}
            showLabels={false}
            className="pt-1"
          />
        )}

        {(showInfoActions || view.showCheckoutCTA) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {showInfoActions && (
              <>
                <JourneyActionButton onClick={onOpenHow}>كيف؟</JourneyActionButton>
                <JourneyActionButton onClick={onOpenAreas}>مناطق التوصيل المجاني</JourneyActionButton>
              </>
            )}
            {view.showCheckoutCTA && (
              <Link
                href="/cart"
                className={cn(
                  'inline-flex items-center justify-center rounded-full bg-primary-500 text-gray-900 px-3 py-1',
                  'text-xs font-semibold min-h-[32px]',
                  'hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-100',
                )}
              >
                {view.visualStage === 'green' ? 'إتمام الطلب' : 'شوف السلة'}
              </Link>
            )}
          </div>
        )}
      </div>

      {isDesktop && view.showPercentBadge && view.showProgressBar && (
        <div className="shrink-0 text-center px-2">
          <p
            className={cn(
              'text-2xl lg:text-3xl font-bold tabular-nums leading-none',
              view.visualStage === 'green' ? 'text-success-600' : 'text-gray-900',
            )}
            aria-label={`${formatProgressPercent(pct)} تقدم`}
          >
            {formatProgressPercent(pct)}
          </p>
        </div>
      )}
    </div>
  );
}
