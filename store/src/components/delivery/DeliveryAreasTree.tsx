'use client';

import { useMemo } from 'react';
import type { DeliveryArea } from '@/lib/types';
import { groupDeliveryAreasForCustomer } from '@/lib/delivery-areas';
import { DeliveryAreaListItem } from './DeliveryAreaListItem';

interface DeliveryAreasTreeProps {
  areas: DeliveryArea[];
}

/** Customer-facing grouped delivery areas — geographic names only. */
export function DeliveryAreasTree({ areas }: DeliveryAreasTreeProps) {
  const groups = useMemo(() => groupDeliveryAreasForCustomer(areas), [areas]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        لا توجد مناطق توصيل متاحة حالياً
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(({ main, children }) => (
        <section key={main.id}>
          {children.length === 0 ? (
            <DeliveryAreaListItem area={main} />
          ) : (
            <>
              <h2 className="text-base font-bold text-navy-900 mb-2 px-0.5">{main.name}</h2>
              <ul className="space-y-2 pr-3 border-r-2 border-primary-100 mr-0.5">
                {[main, ...children].map((area) => (
                  <li key={area.id}>
                    <DeliveryAreaListItem area={area} compact />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
