import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';
import { cn } from '@/lib/utils';
import {
  formatContributionBadge,
  getFreeDeliveryContribution,
} from '@/lib/free-delivery';

interface FreeDeliveryBadgeProps {
  freeDeliveryValue: string | number | null | undefined;
  className?: string;
  /** When true, shows neutral zero-contribution copy instead of hiding. */
  showZeroContribution?: boolean;
}

export function FreeDeliveryBadge({
  freeDeliveryValue,
  className,
  showZeroContribution = false,
}: FreeDeliveryBadgeProps) {
  const raw = Number(freeDeliveryValue ?? 0);
  if (!Number.isFinite(raw) || raw < 0) return null;

  const contribution = getFreeDeliveryContribution(freeDeliveryValue);

  if (contribution == null) {
    if (!showZeroContribution || raw !== 0) return null;

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-xs text-gray-500 leading-snug',
          className,
        )}
        aria-label="لا يساهم في التوصيل المجاني"
      >
        <DeliveryScooterIcon
          className="w-3.5 h-3.5 shrink-0 opacity-70"
          accentClassName="text-gray-400"
        />
        <span>لا يساهم في التوصيل المجاني</span>
      </span>
    );
  }

  const percentLabel = formatContributionBadge(contribution).replace(/%$/, '');

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs leading-snug', className)}
      aria-label={`+${percentLabel}% للتوصيل المجاني`}
    >
      <DeliveryScooterIcon className="w-3.5 h-3.5 shrink-0" accentClassName="text-cta-600" />
      <span className="font-bold text-cta-600 tabular-nums">+{percentLabel}%</span>
      <span className="text-gray-600 font-normal">للتوصيل المجاني</span>
    </span>
  );
}
