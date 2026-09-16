import type { DeliveryArea } from '@/lib/types';
import type { DeliveryRegion } from '@/lib/delivery-regions';

export interface DeliveryAreaGroup {
  main: DeliveryArea;
  children: DeliveryArea[];
}

/** Groups active areas under their main parent for customer display. */
export function groupDeliveryAreasForCustomer(areas: DeliveryArea[]): DeliveryAreaGroup[] {
  const active = areas.filter((a) => a.isActive);
  const mains = active
    .filter((a) => (a.areaType ?? 'MAIN') === 'MAIN')
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const childrenByParent = new Map<string, DeliveryArea[]>();

  for (const area of active) {
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

/** All active areas the customer may select (including parents with children). */
export function getSelectableDeliveryAreas(areas: DeliveryArea[]): DeliveryArea[] {
  return areas.filter((a) => a.isActive);
}

/** Admin tree: all areas grouped under mains (includes inactive for management). */
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

/** Find the parent group containing a selected area id, if any. */
export function findDeliveryAreaGroupForSelection(
  groups: DeliveryAreaGroup[],
  selectedId: string | null,
): DeliveryAreaGroup | null {
  if (!selectedId) return null;
  return (
    groups.find(
      (g) => g.main.id === selectedId || g.children.some((c) => c.id === selectedId),
    ) ?? null
  );
}

export function resolveMainAreaRegion(
  area: DeliveryArea,
  areas: DeliveryArea[],
): DeliveryRegion | null {
  if ((area.areaType ?? 'MAIN') === 'MAIN') {
    return area.region ?? null;
  }
  if (!area.parentId) return null;
  const parent = areas.find((a) => a.id === area.parentId);
  return parent?.region ?? null;
}

/** Areas visible under a geographic region tab. */
export function filterAreasByRegion(
  areas: DeliveryArea[],
  region: DeliveryRegion,
): DeliveryArea[] {
  const active = areas.filter((a) => a.isActive);
  const mainIds = new Set(
    active
      .filter((a) => (a.areaType ?? 'MAIN') === 'MAIN' && a.region === region)
      .map((a) => a.id),
  );
  return active.filter((a) => {
    if ((a.areaType ?? 'MAIN') === 'MAIN') return a.region === region;
    return !!a.parentId && mainIds.has(a.parentId);
  });
}

export function groupDeliveryAreasForRegion(
  areas: DeliveryArea[],
  region: DeliveryRegion,
): DeliveryAreaGroup[] {
  return groupDeliveryAreasForCustomer(filterAreasByRegion(areas, region));
}

/** Client-side name search — returns first active match. */
export function searchDeliveryAreas(
  areas: DeliveryArea[],
  query: string,
): DeliveryArea | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    areas.find(
      (a) => a.isActive && a.name.toLowerCase().includes(q),
    ) ?? null
  );
}

export interface DeliveryAreaSearchContext {
  match: DeliveryArea;
  region: DeliveryRegion | null;
  group: DeliveryAreaGroup | null;
  parent: DeliveryArea | null;
  siblings: DeliveryArea[];
}

/** Search → locate → navigation context for hierarchical UI. */
export function buildDeliveryAreaSearchContext(
  areas: DeliveryArea[],
  query: string,
): DeliveryAreaSearchContext | null {
  const match = searchDeliveryAreas(areas, query);
  if (!match) return null;

  const region = resolveMainAreaRegion(match, areas);
  const scoped = region ? filterAreasByRegion(areas, region) : areas.filter((a) => a.isActive);
  const groups = groupDeliveryAreasForCustomer(scoped);
  const group = findDeliveryAreaGroupForSelection(groups, match.id);
  const parent = group?.main ?? null;

  let siblings: DeliveryArea[] = [];
  if (group) {
    siblings = [group.main, ...group.children];
  } else {
    siblings = [match];
  }

  return { match, region, group, parent, siblings };
}
