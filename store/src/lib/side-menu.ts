import type { LucideIcon } from 'lucide-react';
import {
  Home,
  ShoppingBag,
  Flame,
  Tag,
  FolderOpen,
  Package,
  MessageCircle,
  CircleHelp,
  Phone,
  User,
  MapPin,
  MapPinned,
  Bell,
  Settings,
} from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';

export const SIDE_MENU_VERSION = 'v1.0.0';

export type SideMenuItem = {
  id: string;
  href?: string;
  label: string;
  icon: LucideIcon;
  emoji?: string;
  match?: (pathname: string, search?: string) => boolean;
  badgeKey?: 'orders' | 'notifications';
  action?: 'chatbot' | 'login';
};

export type SideMenuSection = {
  id: string;
  title?: string;
  items: SideMenuItem[];
};

/** Order statuses that warrant a sidebar attention badge. */
const ORDER_ATTENTION_STATUSES = new Set<OrderStatus>([
  'PAYMENT_REJECTED',
  'SHIPPED',
]);

export function countOrdersNeedingAttention(orders: Order[] | undefined): number {
  if (!orders?.length) return 0;
  return orders.filter((order) => ORDER_ATTENTION_STATUSES.has(order.status)).length;
}

export function isSideMenuItemActive(
  pathname: string,
  item: SideMenuItem,
  search = '',
): boolean {
  if (item.match) return item.match(pathname, search);
  if (!item.href) return false;
  if (item.href === '/') return pathname === '/';

  const [hrefPath, hrefQuery = ''] = item.href.split('?');
  if (hrefQuery) {
    return pathname === hrefPath && search.includes(hrefQuery);
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export const sideMenuSections: SideMenuSection[] = [
  {
    id: 'shopping',
    title: 'التسوق',
    items: [
      {
        id: 'home',
        href: '/',
        label: 'الرئيسية',
        emoji: '🏠',
        icon: Home,
        match: (path) => path === '/',
      },
      {
        id: 'shop',
        href: '/categories',
        label: 'تسوق',
        emoji: '🛍️',
        icon: ShoppingBag,
        match: (path) => path === '/categories' || path.startsWith('/categories/'),
      },
      {
        id: 'most-ordered',
        href: '/products?section=most_ordered',
        label: 'الأكثر طلبًا',
        emoji: '🔥',
        icon: Flame,
        match: (path, search = '') =>
          path.startsWith('/products') && search.includes('most_ordered'),
      },
      {
        id: 'offers',
        href: '/products?section=offers',
        label: 'العروض',
        emoji: '🏷️',
        icon: Tag,
        match: (path, search = '') =>
          path.startsWith('/products') && search.includes('offers'),
      },
      {
        id: 'all-categories',
        href: '/categories/all',
        label: 'كل الأقسام',
        emoji: '📂',
        icon: FolderOpen,
        match: (path) => path === '/categories/all',
      },
    ],
  },
  {
    id: 'orders',
    title: 'طلباتي',
    items: [
      {
        id: 'my-orders',
        href: '/orders',
        label: 'طلباتي',
        emoji: '📦',
        icon: Package,
        badgeKey: 'orders',
        match: (path) => path.startsWith('/orders'),
      },
    ],
  },
  {
    id: 'help',
    title: 'المساعدة',
    items: [
      {
        id: 'chatbot',
        label: 'اسأل نحلة مول',
        emoji: '💬',
        icon: MessageCircle,
        action: 'chatbot',
      },
      {
        id: 'help-faq',
        href: '/help',
        label: 'المساعدة والأسئلة الشائعة',
        emoji: '❓',
        icon: CircleHelp,
        match: (path) => path.startsWith('/help'),
      },
      {
        id: 'contact',
        href: '/contact',
        label: 'تواصل معنا',
        emoji: '📞',
        icon: Phone,
        match: (path) => path.startsWith('/contact'),
      },
      {
        id: 'delivery-areas',
        href: '/delivery-areas',
        label: 'مناطق التوصيل',
        emoji: '📍',
        icon: MapPinned,
        match: (path) => path.startsWith('/delivery-areas'),
      },
    ],
  },
  {
    id: 'account',
    title: 'الحساب',
    items: [
      {
        id: 'profile',
        href: '/profile',
        label: 'حسابي',
        emoji: '👤',
        icon: User,
        match: (path) => path.startsWith('/profile'),
      },
      {
        id: 'addresses',
        href: '/settings/addresses',
        label: 'عناويني',
        emoji: '📍',
        icon: MapPin,
        match: (path) => path.startsWith('/settings/addresses'),
      },
      {
        id: 'notifications',
        href: '/notifications',
        label: 'الإشعارات',
        emoji: '🔔',
        icon: Bell,
        badgeKey: 'notifications',
        match: (path) => path.startsWith('/notifications'),
      },
      {
        id: 'settings',
        href: '/settings',
        label: 'الإعدادات',
        emoji: '⚙️',
        icon: Settings,
        match: (path) =>
          path === '/settings' ||
          path.startsWith('/settings/privacy') ||
          path.startsWith('/settings/delete-account'),
      },
    ],
  },
];

export const FREE_DELIVERY_MENU_LINK = {
  href: '/help',
  title: 'كيف تحصل على توصيل مجاني؟',
  subtitle: 'اجمع النسبة وخلي التوصيل علينا',
};
