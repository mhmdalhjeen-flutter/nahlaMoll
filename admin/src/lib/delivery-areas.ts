import type { DeliveryArea } from '@/lib/types';

export type DeliveryAreaType = 'MAIN' | 'SUB_NEAR' | 'SUB_FAR';

export interface DeliveryAreaGroup {
  main: DeliveryArea;
  children: DeliveryArea[];
}

export function groupDeliveryAreasForAdmin(areas: DeliveryArea[]): DeliveryAreaGroup[] {
  const mains = areas.filter((a) => (a.areaType ?? 'MAIN') === 'MAIN');
  const childrenByParent = new Map<string, DeliveryArea[]>();

  for (const area of areas) {
    if (!area.parentId) continue;
    const list = childrenByParent.get(area.parentId) ?? [];
    list.push(area);
    childrenByParent.set(area.parentId, list);
  }

  return mains.map((main) => ({
    main,
    children: (childrenByParent.get(main.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, 'ar'),
    ),
  }));
}

export function getMainAreas(areas: DeliveryArea[]): DeliveryArea[] {
  return areas.filter((a) => (a.areaType ?? 'MAIN') === 'MAIN');
}

export function adminAreaTypeLabel(type?: DeliveryAreaType): string {
  switch (type) {
    case 'SUB_NEAR':
      return 'فرعية قريبة';
    case 'SUB_FAR':
      return 'فرعية بعيدة';
    default:
      return 'رئيسية';
  }
}

export function adminAreaTypeBadgeClass(type?: DeliveryAreaType): string {
  switch (type) {
    case 'SUB_NEAR':
      return 'badge-info';
    case 'SUB_FAR':
      return 'badge-warning';
    default:
      return 'badge-primary';
  }
}
