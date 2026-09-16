import type { LucideIcon } from 'lucide-react';
import { Flame, Home, LayoutGrid, Package, Recycle, Tag } from 'lucide-react';

export type HeaderNavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  match: (pathname: string, search?: string) => boolean;
};

/** Desktop secondary navigation — shopping discovery row. */
export const desktopSecondaryNav: HeaderNavItem[] = [
  {
    href: '/',
    label: 'الرئيسية',
    icon: Home,
    match: (path) => path === '/',
  },
  {
    href: '/categories',
    label: 'الأقسام',
    icon: LayoutGrid,
    match: (path) => path === '/categories' || path.startsWith('/categories/'),
  },
  {
    href: '/products?section=most_ordered',
    label: 'الأكثر طلبًا',
    icon: Flame,
    match: (path, search = '') =>
      path.startsWith('/products') && search.includes('most_ordered'),
  },
  {
    href: '/products?section=offers',
    label: 'العروض',
    icon: Tag,
    match: (path, search = '') =>
      path.startsWith('/products') && search.includes('offers'),
  },
  {
    href: '/used',
    label: 'المستعمل',
    icon: Recycle,
    match: (path) => path === '/used' || path.startsWith('/used/'),
  },
  {
    href: '/orders',
    label: 'طلباتي',
    icon: Package,
    match: (path) => path.startsWith('/orders'),
  },
];

export function isHeaderRouteActive(
  pathname: string,
  href: string,
): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/categories') {
    return pathname === '/categories' || pathname.startsWith('/categories/');
  }
  if (href === '/cart') {
    return pathname === '/cart' || pathname.startsWith('/checkout');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
