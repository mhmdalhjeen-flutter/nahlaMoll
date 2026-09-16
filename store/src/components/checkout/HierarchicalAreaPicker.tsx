'use client';

import { DeliveryAreaNavigator } from '@/components/delivery/DeliveryAreaNavigator';
import type { DeliveryArea } from '@/lib/types';

interface HierarchicalAreaPickerProps {
  areas: DeliveryArea[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  maxHeightClass?: string;
}

/** @deprecated Prefer DeliveryAreaNavigator — kept for settings compatibility. */
export function HierarchicalAreaPicker({
  areas,
  selectedId,
  onSelect,
  maxHeightClass = 'max-h-52',
}: HierarchicalAreaPickerProps) {
  return (
    <DeliveryAreaNavigator
      areas={areas}
      selectedAreaId={selectedId}
      onSelectArea={onSelect}
      listMaxHeightClass={maxHeightClass}
    />
  );
}
