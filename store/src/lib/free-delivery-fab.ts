import { FREE_DELIVERY_ELIGIBILITY_THRESHOLD } from '@/lib/delivery.constants';
import type { FreeDeliverySummary } from '@/lib/types';
import type { ToastType } from '@/stores/toast-store';

export type FreeDeliveryFabStage =
  | 'building'
  | 'encouragement'
  | 'eligible'
  | 'complete';

export interface FreeDeliveryFabViewModel {
  stage: FreeDeliveryFabStage;
  /** Display percentage capped at 100 — from cart summary only. */
  displayPct: number;
  rawPct: number;
  subtotal: number;
  /** Remaining percentage points until 95% eligibility threshold. */
  remainingToEligibility: number;
  isFreeDelivery: boolean;
  headline: string | null;
  subline: string | null;
  strokeClass: string;
  ringClass: string;
  textClass: string;
}

export function buildFreeDeliveryFabView(
  summary: FreeDeliverySummary | undefined,
): FreeDeliveryFabViewModel | null {
  if (!summary || (summary.totalItems ?? 0) <= 0) return null;

  const rawPct = summary.progressPercentage ?? 0;
  const displayPct = Math.min(100, Math.max(0, rawPct));
  const isFreeDelivery = summary.isFreeDelivery ?? false;
  const remainingToEligibility = Math.max(
    0,
    FREE_DELIVERY_ELIGIBILITY_THRESHOLD - rawPct,
  );

  if (displayPct >= 100 || (isFreeDelivery && rawPct >= 100)) {
    return {
      stage: 'complete',
      displayPct: 100,
      rawPct,
      subtotal: summary.subtotal ?? 0,
      remainingToEligibility: 0,
      isFreeDelivery: true,
      headline: 'مبارك! حصلت على توصيل مجاني 🎉',
      subline: 'مبارك! توصيل مجاني',
      strokeClass: 'stroke-success-600',
      ringClass: 'ring-success-200',
      textClass: 'text-success-700',
    };
  }

  if (isFreeDelivery && rawPct >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD) {
    return {
      stage: 'eligible',
      displayPct,
      rawPct,
      subtotal: summary.subtotal ?? 0,
      remainingToEligibility: 0,
      isFreeDelivery: true,
      headline: 'كملنا الباقي عنك… التوصيل علينا!',
      subline: displayPct < 100 ? `باقي ${Math.ceil(100 - displayPct)}% للاكتمال` : null,
      strokeClass: 'stroke-primary-600',
      ringClass: 'ring-success-200/80',
      textClass: 'text-navy-800',
    };
  }

  if (rawPct >= 80 && rawPct < FREE_DELIVERY_ELIGIBILITY_THRESHOLD) {
    return {
      stage: 'encouragement',
      displayPct,
      rawPct,
      subtotal: summary.subtotal ?? 0,
      remainingToEligibility,
      isFreeDelivery: false,
      headline: 'لقد اقتربت لتحصل على التوصيل المجاني',
      subline: `باقي ${Math.ceil(remainingToEligibility)}%`,
      strokeClass: 'stroke-primary-600',
      ringClass: 'ring-primary-200',
      textClass: 'text-navy-800',
    };
  }

  return {
    stage: 'building',
    displayPct,
    rawPct,
    subtotal: summary.subtotal ?? 0,
    remainingToEligibility,
    isFreeDelivery: false,
    headline: null,
    subline: null,
    strokeClass: 'stroke-primary-500',
    ringClass: 'ring-primary-100',
    textClass: 'text-navy-800',
  };
}

/** Whether the floating progress indicator should render on this route. */
export function shouldShowFreeDeliveryFab(pathname: string): boolean {
  return pathname !== '/checkout';
}

/** Toast copy when entering a milestone stage (not on initial mount). */
export function getFreeDeliveryFabStageToast(
  view: FreeDeliveryFabViewModel,
): { message: string; type: ToastType } | null {
  switch (view.stage) {
    case 'encouragement':
      return {
        message: view.subline
          ? `لقد اقتربت لتحصل على التوصيل المجاني\n${view.subline}`
          : 'لقد اقتربت لتحصل على التوصيل المجاني',
        type: 'info',
      };
    case 'eligible':
      return {
        message: 'كملنا الباقي عنك… التوصيل علينا!',
        type: 'info',
      };
    case 'complete':
      return {
        message: 'مبارك! حصلت على توصيل مجاني 🎉',
        type: 'success',
      };
    default:
      return null;
  }
}

const FAB_STAGE_ORDER: Record<FreeDeliveryFabStage, number> = {
  building: 0,
  encouragement: 1,
  eligible: 2,
  complete: 3,
};

export function shouldNotifyFreeDeliveryStageChange(
  prev: FreeDeliveryFabStage | null,
  next: FreeDeliveryFabStage,
  isInitialSync: boolean,
): boolean {
  if (isInitialSync || prev === null || prev === next) return false;
  const milestone: FreeDeliveryFabStage[] = [
    'encouragement',
    'eligible',
    'complete',
  ];
  if (!milestone.includes(next)) return false;
  return FAB_STAGE_ORDER[next] > FAB_STAGE_ORDER[prev];
}
