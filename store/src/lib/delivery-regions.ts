export type DeliveryRegion = 'NORTH' | 'GAZA' | 'MIDDLE' | 'SOUTH';

export const DELIVERY_REGIONS: { id: DeliveryRegion; label: string }[] = [
  { id: 'NORTH', label: 'الشمال' },
  { id: 'GAZA', label: 'غزة' },
  { id: 'MIDDLE', label: 'الوسطى' },
  { id: 'SOUTH', label: 'الجنوب' },
];

export function deliveryRegionLabel(region?: DeliveryRegion | null): string {
  if (!region) return '';
  return DELIVERY_REGIONS.find((r) => r.id === region)?.label ?? '';
}

export function isDeliveryRegion(value: string): value is DeliveryRegion {
  return DELIVERY_REGIONS.some((r) => r.id === value);
}
