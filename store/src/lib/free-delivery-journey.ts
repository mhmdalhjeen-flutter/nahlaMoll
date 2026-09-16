import { FREE_DELIVERY_ELIGIBILITY_THRESHOLD } from './delivery.constants';

/** Visual progress stage — presentation only; does not affect business rules. */
export type FreeDeliveryVisualStage = 'none' | 'yellow' | 'orange' | 'blue' | 'green';

export interface FreeDeliveryJourneyView {
  visualStage: FreeDeliveryVisualStage;
  headline: string;
  subline?: string;
  showProgressBar: boolean;
  showPercentBadge: boolean;
  showFirstTimeCTA: boolean;
  showHowLink: boolean;
  showAreasLink: boolean;
  showCheckoutCTA: boolean;
  compactHint?: string;
  progressLabel: string;
}

export interface JourneyMessageInput {
  isAuthenticated: boolean;
  pct: number;
  achieved: boolean;
  hasExplained: boolean;
  isEmptyCart: boolean;
  highProgressNotFree: boolean;
  hasCartItems: boolean;
}

/** Secondary actions appear once shopping has started or progress is above 0%. */
export function canShowSecondaryActions(pct: number, hasCartItems: boolean): boolean {
  return pct > 0 || hasCartItems;
}

export function getVisualStage(pct: number, achieved: boolean): FreeDeliveryVisualStage {
  if (achieved || pct >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD) return 'green';
  if (pct >= 80) return 'orange';
  if (pct >= 50) return 'blue';
  if (pct > 0) return 'yellow';
  return 'none';
}

/** @deprecated Prefer STAGE_FILL_CLASS in FreeDeliveryProgressBar — kept for tests */
export function getProgressBarColorClass(stage: FreeDeliveryVisualStage): string {
  switch (stage) {
    case 'yellow':
      return 'bg-primary-400';
    case 'blue':
      return 'bg-navy-500';
    case 'orange':
      return 'bg-primary-600';
    case 'green':
      return 'bg-success-600';
    default:
      return 'bg-transparent';
  }
}

function formatRemaining(pct: number): string {
  const remaining = Math.max(0, Math.min(100, 100 - pct));
  const rounded = Math.round(remaining);
  return `${rounded}%`;
}

function resolveHowActions(hasExplained: boolean, secondary: boolean) {
  if (!secondary) {
    return { showFirstTimeCTA: false, showHowLink: false };
  }
  if (!hasExplained) {
    return { showFirstTimeCTA: true, showHowLink: false };
  }
  return { showFirstTimeCTA: false, showHowLink: true };
}

export function buildFreeDeliveryJourneyView(input: JourneyMessageInput): FreeDeliveryJourneyView {
  const {
    isAuthenticated,
    pct,
    achieved,
    hasExplained,
    isEmptyCart,
    highProgressNotFree,
    hasCartItems,
  } = input;

  const visualStage = getVisualStage(pct, achieved && !highProgressNotFree);
  const roundedPct = Math.round(pct);
  const secondary = canShowSecondaryActions(pct, hasCartItems);
  const howActions = resolveHowActions(hasExplained, secondary);

  const base = {
    showAreasLink: secondary,
    showHowLink: howActions.showHowLink,
    showFirstTimeCTA: howActions.showFirstTimeCTA,
    showCheckoutCTA: false,
    showProgressBar: true,
    showPercentBadge: false,
    progressLabel: `${roundedPct}%`,
    visualStage,
  } satisfies Partial<FreeDeliveryJourneyView>;

  if (highProgressNotFree) {
    return {
      ...base,
      visualStage: pct >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD ? 'green' : getVisualStage(pct, false),
      headline: 'وصلت للحد المطلوب',
      subline: 'التوصيل المجاني غير متاح حاليًا لمنطقتك.',
      showProgressBar: isAuthenticated && pct >= 0,
      showPercentBadge: isAuthenticated && pct > 0,
      showHowLink: secondary && hasExplained,
      showFirstTimeCTA: secondary && !hasExplained,
      compactHint: `${roundedPct}%`,
    };
  }

  if (achieved && pct >= 100) {
    return {
      ...base,
      visualStage: 'green',
      headline: '🎉 كملنا الباقي عنك… التوصيل علينا!',
      showPercentBadge: true,
      showCheckoutCTA: hasCartItems,
      progressLabel: `${roundedPct}%`,
      compactHint: 'التوصيل علينا',
    };
  }

  if (achieved && pct >= FREE_DELIVERY_ELIGIBILITY_THRESHOLD) {
    return {
      ...base,
      visualStage: 'green',
      headline: '🎉 كملنا الباقي عنك… التوصيل علينا!',
      showPercentBadge: true,
      showCheckoutCTA: hasCartItems,
      progressLabel: `${roundedPct}%`,
      compactHint: 'التوصيل علينا',
    };
  }

  if (!hasExplained && (!isAuthenticated || isEmptyCart)) {
    return {
      ...base,
      visualStage: 'none',
      headline: 'اشتري وإنت مرتاح… التوصيل علينا لما تكملها!',
      subline: 'كل منتج بقربك من التوصيل المجاني.',
      showFirstTimeCTA: false,
      showHowLink: false,
      showAreasLink: false,
      progressLabel: '0%',
    };
  }

  if (isEmptyCart) {
    return {
      ...base,
      visualStage: 'none',
      headline: 'ابدأ تسوقك وكملها لـ100%',
      subline: 'كل منتج بقربك من التوصيل المجاني.',
      showHowLink: false,
      showAreasLink: false,
      progressLabel: '0%',
    };
  }

  if (!isAuthenticated) {
    return {
      ...base,
      visualStage: 'none',
      headline: 'ابدأ تسوقك وكملها لـ100%',
      subline: 'كل منتج بقربك من التوصيل المجاني.',
      showHowLink: false,
      showAreasLink: false,
      progressLabel: '0%',
    };
  }

  let headline: string;
  let subline: string | undefined;

  if (pct <= 0) {
    headline = 'ابدأ تسوقك وكملها لـ100%';
    subline = 'كل منتج بقربك من التوصيل المجاني.';
  } else if (pct < 50) {
    headline = `👏 وصلت إلى ${roundedPct}%`;
  } else if (pct < 80) {
    headline = `🎯 ممتاز! وصلت لـ${roundedPct}%`;
    subline = `باقي لك ${formatRemaining(pct)}`;
  } else if (pct < FREE_DELIVERY_ELIGIBILITY_THRESHOLD) {
    headline = '🔥 قربت كثير!';
    subline = `باقي لك ${formatRemaining(pct)} فقط`;
  } else {
    headline = '🎉 كملنا الباقي عنك… التوصيل علينا!';
  }

  return {
    ...base,
    visualStage: getVisualStage(pct, false),
    headline,
    subline,
    showPercentBadge: pct > 0,
    ...resolveHowActions(hasExplained, secondary),
    showAreasLink: secondary,
    compactHint: `${roundedPct}% · ${formatRemaining(pct)}`,
    progressLabel: `${roundedPct}%`,
  };
}
