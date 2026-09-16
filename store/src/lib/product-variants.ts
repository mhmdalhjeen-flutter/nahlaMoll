import type { Product, ProductVariant } from '@/lib/types';
import { isProductPurchasable } from '@/lib/free-delivery';

/** Group flat API variants by their `type` field (same logic as VariantPickerModal). */
export function groupVariantsByType(variants: ProductVariant[]): Map<string, ProductVariant[]> {
  const groups = new Map<string, ProductVariant[]>();
  for (const v of variants) {
    const type = v.type?.trim() || 'الخيار';
    const list = groups.get(type) ?? [];
    list.push(v);
    groups.set(type, list);
  }
  return groups;
}

export function getVariantLabel(variant: ProductVariant): string {
  const name = variant.name?.trim();
  const value = variant.value?.trim();
  return name || value || '—';
}

export function hasProductVariants(variants: ProductVariant[] | undefined | null): boolean {
  return (variants?.length ?? 0) > 0;
}

/** First purchasable variant in API order; null when none are available. */
export function getDefaultProductVariant(
  product: Pick<Product, 'availability' | 'isAvailable' | 'stock' | 'variants'>,
): ProductVariant | null {
  const variants = product.variants ?? [];
  if (variants.length === 0) return null;

  for (const variant of variants) {
    if (isProductPurchasable(product, variant)) {
      return variant;
    }
  }
  return null;
}
