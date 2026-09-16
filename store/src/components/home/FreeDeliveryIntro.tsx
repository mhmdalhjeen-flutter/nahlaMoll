'use client';

import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';
import { HOME_COPY } from '@/lib/branding';

/** Static homepage free-delivery introduction — informational only, no cart progress. */
export function FreeDeliveryIntro() {
  return (
    <section className="container mx-auto px-4 py-2 max-w-6xl" aria-label="ميزة التوصيل المجاني">
      <div className="rounded-xl border border-navy-100 bg-white shadow-sm px-4 py-3 sm:px-5 sm:py-3.5 flex items-start gap-3 border-r-[3px] border-r-primary-500">
        <div
          className="shrink-0 w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center"
          aria-hidden
        >
          <DeliveryScooterIcon className="w-5 h-5" accentClassName="text-primary-400" />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-sm sm:text-base font-bold text-navy-900 leading-snug">
            {HOME_COPY.freeDeliveryHeadline}
          </p>
          <p className="text-xs sm:text-sm text-navy-600 mt-0.5 leading-snug font-medium">
            {HOME_COPY.freeDeliverySubline}
          </p>
        </div>
      </div>
    </section>
  );
}
