import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';
import { cn } from '@/lib/utils';
import { formatContributionBadge, getFreeDeliveryContribution } from '@/lib/free-delivery';

interface ProductFreeDeliveryCardProps {
  freeDeliveryValue: string | number | null | undefined;
  className?: string;
}

export function ProductFreeDeliveryCard({
  freeDeliveryValue,
  className,
}: ProductFreeDeliveryCardProps) {
  const raw = Number(freeDeliveryValue ?? 0);
  if (!Number.isFinite(raw) || raw < 0) return null;

  const contribution = getFreeDeliveryContribution(freeDeliveryValue);

  if (contribution == null) {
    return (
      <div
        className={cn(
          'rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-start gap-3',
          className,
        )}
      >
        <DeliveryScooterIcon className="w-6 h-6 shrink-0 mt-0.5" accentClassName="text-gray-400" />
        <p className="text-sm text-gray-600 leading-relaxed">
          هذا المنتج لا يساهم في التوصيل المجاني
        </p>
      </div>
    );
  }

  const percent = formatContributionBadge(contribution).replace(/%$/, '');

  return (
    <div
      className={cn(
        'rounded-xl border border-primary-100 bg-primary-50/60 p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <DeliveryScooterIcon className="w-7 h-7 shrink-0 mt-0.5" accentClassName="text-cta-600" />
        <div>
          <p className="leading-none">
            <span className="text-2xl font-bold text-cta-600 tabular-nums">+{percent}%</span>
          </p>
          <p className="text-sm text-gray-700 mt-1">للتوصيل المجاني</p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            هذا المنتج يقربك {percent}% من التوصيل المجاني.
          </p>
        </div>
      </div>
    </div>
  );
}
