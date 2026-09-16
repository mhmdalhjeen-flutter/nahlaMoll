import type { CartItem, Product, ProductVariant } from '@/lib/types';
import { calculateUnitPrice } from '@/lib/product-meta';
import {
  formatContributionBadge,
  getFreeDeliveryContribution,
  isProductPurchasable,
} from '@/lib/free-delivery';

/** Max purchasable quantity for a cart line; undefined when unlimited. */
export function getCartItemMaxStock(
  product: Pick<Product, 'availability' | 'stock' | 'variants'>,
  variant?: ProductVariant | null,
): number | undefined {
  if (product.availability === 'UNLIMITED') return undefined;
  if (variant) return Math.max(0, variant.stock);
  return Math.max(0, product.stock);
}

export function isCartItemInvalid(item: CartItem): boolean {
  if (!isProductPurchasable(item.product, item.variant)) return true;
  const maxStock = getCartItemMaxStock(item.product, item.variant);
  return maxStock != null && item.quantity > maxStock;
}

export function getCartLinePricing(item: CartItem) {
  const variantAdjustment = item.variant
    ? parseFloat(String(item.variant.priceAdjustment))
    : 0;
  const { unitPrice } = calculateUnitPrice(item.product, variantAdjustment);
  const lineTotal = unitPrice * item.quantity;
  return { unitPrice, lineTotal, variantAdjustment };
}

export function getCartItemContributionLabel(item: CartItem): string {
  const perUnit = getFreeDeliveryContribution(item.product.freeDeliveryValue);
  if (perUnit == null || perUnit <= 0) {
    return 'لا يساهم في التوصيل المجاني.';
  }
  const total = perUnit * item.quantity;
  return `🚚 +${formatContributionBadge(perUnit)} لكل قطعة · مجموعك +${formatContributionBadge(total)}`;
}

export function formatCartHeaderCounts(itemCount: number, totalPieces: number): string {
  const productsLabel = itemCount === 1 ? 'منتج' : 'منتجات';
  const piecesLabel = totalPieces === 1 ? 'قطعة' : 'قطع';
  return `${itemCount} ${productsLabel} · ${totalPieces} ${piecesLabel}`;
}
