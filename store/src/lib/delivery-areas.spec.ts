import { describe, expect, it } from 'vitest';
import type { DeliveryArea } from './types';
import {
  buildDeliveryAreaSearchContext,
  filterAreasByRegion,
  findDeliveryAreaGroupForSelection,
  getSelectableDeliveryAreas,
  groupDeliveryAreasForCustomer,
} from './delivery-areas';

function area(
  id: string,
  name: string,
  overrides: Partial<DeliveryArea> = {},
): DeliveryArea {
  return {
    id,
    name,
    deliveryFee: 10,
    eligibleForFreeDelivery: true,
    isActive: true,
    areaType: 'MAIN',
    parentId: null,
    ...overrides,
  };
}

describe('delivery-areas', () => {
  it('groups child areas under their main parent', () => {
    const areas = [
      area('main-1', 'الجلاء'),
      area('sub-1', 'دوار الصاروخ', {
        areaType: 'SUB_NEAR',
        parentId: 'main-1',
      }),
      area('sub-2', 'دوار ضبيط', {
        areaType: 'SUB_FAR',
        parentId: 'main-1',
      }),
      area('main-2', 'السرايا'),
    ];

    const groups = groupDeliveryAreasForCustomer(areas);
    expect(groups).toHaveLength(2);
    expect(groups[0].main.name).toBe('الجلاء');
    expect(groups[0].children.map((c) => c.name)).toEqual([
      'دوار الصاروخ',
      'دوار ضبيط',
    ]);
    expect(groups[1].main.name).toBe('السرايا');
    expect(groups[1].children).toHaveLength(0);
  });

  it('allows selecting parent areas that have children', () => {
    const areas = [
      area('main-1', 'الجلاء'),
      area('sub-1', 'دوار الصاروخ', {
        areaType: 'SUB_NEAR',
        parentId: 'main-1',
      }),
    ];

    const selectable = getSelectableDeliveryAreas(areas);
    expect(selectable.some((a) => a.id === 'main-1')).toBe(true);
    expect(selectable.some((a) => a.id === 'sub-1')).toBe(true);
  });

  it('finds parent group for a child selection', () => {
    const groups = groupDeliveryAreasForCustomer([
      area('main-1', 'الجلاء'),
      area('sub-1', 'دوار الصاروخ', {
        areaType: 'SUB_NEAR',
        parentId: 'main-1',
      }),
    ]);

    const group = findDeliveryAreaGroupForSelection(groups, 'sub-1');
    expect(group?.main.id).toBe('main-1');
  });

  it('filters areas by geographic region', () => {
    const areas = [
      area('g-main', 'الجلاء', { region: 'GAZA' }),
      area('g-sub', 'دوار الصاروخ', {
        areaType: 'SUB_NEAR',
        parentId: 'g-main',
      }),
      area('n-main', 'السرايا', { region: 'NORTH' }),
    ];
    const gaza = filterAreasByRegion(areas, 'GAZA');
    expect(gaza.map((a) => a.id)).toEqual(['g-main', 'g-sub']);
  });

  it('builds search context with parent and siblings', () => {
    const areas = [
      area('g-main', 'الجلاء', { region: 'GAZA' }),
      area('g-sub', 'دوار الصاروخ', {
        areaType: 'SUB_NEAR',
        parentId: 'g-main',
      }),
      area('g-sub2', 'دوار ضبيط', {
        areaType: 'SUB_FAR',
        parentId: 'g-main',
      }),
    ];
    const ctx = buildDeliveryAreaSearchContext(areas, 'الصاروخ');
    expect(ctx?.match.name).toBe('دوار الصاروخ');
    expect(ctx?.region).toBe('GAZA');
    expect(ctx?.parent?.name).toBe('الجلاء');
    expect(ctx?.siblings).toHaveLength(3);
  });
});
