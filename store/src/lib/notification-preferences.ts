import type { NotificationPreferencePatch } from './types';

export type NotificationCategoryKey = keyof Pick<
  NotificationPreferencePatch,
  | 'orderUpdates'
  | 'freeDelivery'
  | 'favorites'
  | 'offers'
  | 'personalRecommendations'
  | 'newProducts'
  | 'abuAlaaNews'
>;

export interface NotificationCategoryDefinition {
  key: NotificationCategoryKey;
  emoji: string;
  title: string;
  description: string;
  defaultEnabled: boolean;
  transactional?: boolean;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryDefinition[] = [
  {
    key: 'orderUpdates',
    emoji: '📦',
    title: 'تحديثات الطلبات',
    description: 'نخبرك بكل تغيير مهم على طلبك.',
    defaultEnabled: true,
    transactional: true,
  },
  {
    key: 'freeDelivery',
    emoji: '🚚',
    title: 'التوصيل المجاني',
    description: 'خليك عارف لما تقترب من التوصيل المجاني.',
    defaultEnabled: true,
  },
  {
    key: 'favorites',
    emoji: '❤️',
    title: 'المفضلة',
    description: 'نعلمك إذا صار شيء مهم على المنتجات اللي بتحبها.',
    defaultEnabled: false,
  },
  {
    key: 'offers',
    emoji: '🔥',
    title: 'العروض والخصومات',
    description: 'وصلك العروض والخصومات اللي ممكن تهمك.',
    defaultEnabled: false,
  },
  {
    key: 'personalRecommendations',
    emoji: '✨',
    title: 'اقتراحات تناسبك',
    description: 'نرسل لك منتجات ممكن تناسب اهتماماتك وطريقة تسوقك.',
    defaultEnabled: false,
  },
  {
    key: 'newProducts',
    emoji: '🆕',
    title: 'منتجات جديدة',
    description: 'اعرف لما تنزل منتجات جديدة ممكن تهمك.',
    defaultEnabled: false,
  },
  {
    key: 'abuAlaaNews',
    emoji: '📣',
    title: 'أخبار وعروض نحلة مول',
    description: 'الحملات والمناسبات والعروض العامة المهمة.',
    defaultEnabled: false,
  },
];

export const DEFAULT_DND_FROM = '22:00';
export const DEFAULT_DND_UNTIL = '08:00';

/** Display 24h HH:mm as Arabic 12h label for settings UI. */
export function formatTime12hAr(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;

  const isPm = h >= 12;
  const hour12 = h % 12 || 12;
  const suffix = isPm ? 'م' : 'ص';
  const minutes = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
  return `${hour12}${minutes} ${suffix}`;
}
