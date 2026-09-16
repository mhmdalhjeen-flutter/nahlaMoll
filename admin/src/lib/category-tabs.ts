import type { Category } from '@/lib/types';

export interface CategoryTabItem {
  id: string;
  name: string;
  depth: number;
  productCount: number;
}

/** Flat list: root categories then their active children (RTL hierarchy). */
export function buildActiveCategoryTabs(categories: Category[]): CategoryTabItem[] {
  const active = categories.filter((c) => c.isActive);
  const roots = active
    .filter((c) => !c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const tabs: CategoryTabItem[] = [];

  for (const root of roots) {
    tabs.push({
      id: root.id,
      name: root.name,
      depth: 0,
      productCount: root._count?.products ?? 0,
    });

    const children = active
      .filter((c) => c.parentId === root.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    for (const child of children) {
      tabs.push({
        id: child.id,
        name: child.name,
        depth: 1,
        productCount: child._count?.products ?? 0,
      });
    }
  }

  return tabs;
}
