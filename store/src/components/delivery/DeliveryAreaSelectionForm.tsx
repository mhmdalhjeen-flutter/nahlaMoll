'use client';

import { cn } from '@/lib/utils';
import type { DeliveryArea } from '@/lib/types';
import { Textarea } from '@/components/ui/Input';
import { DeliveryAreaNavigator } from './DeliveryAreaNavigator';

interface DeliveryAreaSelectionFormProps {
  areas: DeliveryArea[];
  selectedAreaId: string | null;
  onSelectArea: (id: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  listMaxHeightClass?: string;
  className?: string;
}

export function DeliveryAreaSelectionForm({
  areas,
  selectedAreaId,
  onSelectArea,
  address,
  onAddressChange,
  notes,
  onNotesChange,
  listMaxHeightClass,
  className,
}: DeliveryAreaSelectionFormProps) {
  const selectedArea = areas.find((a) => a.id === selectedAreaId);

  return (
    <div className={cn('space-y-4', className)}>
      <DeliveryAreaNavigator
        areas={areas}
        selectedAreaId={selectedAreaId}
        onSelectArea={onSelectArea}
        listMaxHeightClass={listMaxHeightClass}
      />

      {selectedArea && (
        <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 text-sm text-navy-800">
          <span className="text-gray-500">المنطقة: </span>
          <span className="font-semibold">{selectedArea.name} ✓</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          العنوان بالتفصيل <span className="text-error-500">*</span>
        </label>
        <Textarea
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="اكتب الشارع، رقم المنزل، أو أقرب معلم..."
          rows={3}
          className="min-h-[96px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ملاحظة اختيارية
        </label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="مثال: بجانب مسجد ..."
          rows={2}
        />
      </div>
    </div>
  );
}
