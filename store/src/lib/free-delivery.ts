import type { Product, ProductVariant } from './types';

/** Percentage contribution per unit toward free delivery (may exceed 100). */
export function getFreeDeliveryContribution(
  freeDeliveryValue: string | number | null | undefined,
): number | null {
  const value = Number(freeDeliveryValue ?? 0);
  if (!Number.isFinite(value) || value < 0) return null;
  if (value === 0) return null;
  return value;
}

export function formatContributionBadge(value: number): string {
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, '');
  return `${formatted}%`;
}

export function formatProgressPercent(value: number): string {
  const capped = Math.min(100, Math.max(0, value));
  const formatted = Number.isInteger(capped)
    ? String(capped)
    : capped.toFixed(1).replace(/\.0$/, '');
  return `${formatted}%`;
}

/** Whether the product (and optional variant) has stock available for purchase. */
export function isProductInStock(
  product: Pick<Product, 'availability' | 'stock' | 'variants'>,
  variant?: ProductVariant | null,
): boolean {
  if (product.availability === 'UNLIMITED') return true;
  if (product.availability !== 'LIMITED') return false;

  if (variant) {
    return variant.stock > 0;
  }

  const variants = product.variants ?? [];
  if (variants.length > 0) {
    return variants.some((v) => v.stock > 0);
  }

  return product.stock > 0;
}

/** Whether the customer can add this product to cart. */
export function isProductPurchasable(
  product: Pick<Product, 'availability' | 'isAvailable' | 'stock' | 'variants'>,
  variant?: ProductVariant | null,
): boolean {
  if (product.availability === 'UNAVAILABLE' || !product.isAvailable) {
    return false;
  }
  return isProductInStock(product, variant);
}

export const OUT_OF_STOCK_LABEL = 'غير متوفر حاليا';

export function getProductUnavailableLabel(
  product: Pick<Product, 'availability' | 'isAvailable' | 'stock' | 'variants'>,
  variant?: ProductVariant | null,
): string {
  if (product.availability === 'UNAVAILABLE' || !product.isAvailable) {
    return 'غير متاح للشراء';
  }
  if (!isProductInStock(product, variant)) {
    return OUT_OF_STOCK_LABEL;
  }
  return 'غير متاح للشراء';
}
