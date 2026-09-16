'use client';

import { useState } from 'react';
import { MapPin, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeliveryArea } from '@/lib/types';
import { CheckoutSection } from './CheckoutSection';
import { DeliveryAreaChangeModal } from '@/components/delivery/DeliveryAreaChangeModal';
import { useCheckoutStore } from '@/stores/checkout-store';

interface DeliverySectionProps {
  areas: DeliveryArea[];
  deliveryAreaId: string | null;
  onDeliveryAreaChange: (id: string | null) => void;
  address: string;
  onAddressChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  step?: number;
  className?: string;
}

export function DeliverySection({
  areas,
  deliveryAreaId,
  onDeliveryAreaChange,
  address,
  onAddressChange,
  notes,
  onNotesChange,
  step = 1,
  className,
}: DeliverySectionProps) {
  const storedNotes = useCheckoutStore((s) => s.deliveryNotes);
  const activeAreas = areas.filter((a) => a.isActive);
  const selectedArea = activeAreas.find((a) => a.id === deliveryAreaId);
  const hasCompleteAddress = !!deliveryAreaId && address.trim().length >= 5;
  const [modalOpen, setModalOpen] = useState(false);

  const handleConfirmed = () => {
    const state = useCheckoutStore.getState();
    onDeliveryAreaChange(state.deliveryAreaId);
    onAddressChange(state.deliveryAddress);
    onNotesChange(state.deliveryNotes || storedNotes);
  };

  return (
    <>
      <CheckoutSection title="عنوان التوصيل" step={step} className={className} id="checkout-address">
        {!deliveryAreaId && (
          <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary-600" aria-hidden />
            اختر منطقة التوصيل وأدخل عنوانك لإكمال الطلب.
          </p>
        )}

        {hasCompleteAddress && selectedArea ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500 mb-0.5">منطقة التوصيل</dt>
              <dd className="font-medium text-gray-900">{selectedArea.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-0.5">العنوان التفصيلي</dt>
              <dd className="font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                {address.trim()}
              </dd>
            </div>
            {(notes.trim() || storedNotes.trim()) && (
              <div>
                <dt className="text-gray-500 mb-0.5">ملاحظة</dt>
                <dd className="text-gray-700 whitespace-pre-wrap">
                  {notes.trim() || storedNotes.trim()}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-500 mb-3">
            لم يتم تحديد منطقة التوصيل بعد.
          </p>
        )}

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cn(
            'mt-2 flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800',
            'min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-lg px-1',
          )}
        >
          <Pencil className="w-4 h-4" aria-hidden />
          {hasCompleteAddress ? 'تغيير منطقة التوصيل' : 'اختر منطقة التوصيل'}
        </button>
      </CheckoutSection>

      <DeliveryAreaChangeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        areas={areas}
        onConfirmed={handleConfirmed}
      />
    </>
  );
}
