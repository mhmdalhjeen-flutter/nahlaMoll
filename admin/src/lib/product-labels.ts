import type { Product } from '@/lib/types';
import { getOfferKindLabel, parseProductTags } from '@/lib/product-meta';

export function getConditionLabel(condition?: Product['condition']): string {
  if (condition === 'USED') return 'مستعمل';
  if (condition === 'NEW') return 'جديد';
  return 'جديد';
}

export function getProductStatusBadges(product: Product) {
  const meta = parseProductTags(product.tags ?? []);
  const badges: { label: string; tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' }[] = [];

  if (product.hasOffer) {
    badges.push({
      label: meta.offerKind ? getOfferKindLabel(meta.offerKind) : 'عرض',
      tone: 'error',
    });
  }
  if (product.isRecommended) {
    badges.push({ label: 'موصى به', tone: 'warning' });
  }
  if (!product.isActive) {
    badges.push({ label: 'غير نشط', tone: 'neutral' });
  }

  return badges;
}
