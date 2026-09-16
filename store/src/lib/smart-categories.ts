import type { Category, Favorite, CartItem, Order } from '@/lib/types';

/** Categories shown in the mobile category bar scroll area (excluding الكل and كل الأقسام). */
export const SMART_CATEGORY_MOBILE_VISIBLE = 4;

/** Target smart category count for desktop / full lists (not a hard requirement). */
export const SMART_CATEGORY_TARGET = 8;

export type CategoryAffinityMaps = {
  favorites: Map<string, number>;
  cart: Map<string, number>;
  orders: Map<string, number>;
};

/** Build per-category affinity counts from real user data. */
export function buildCategoryAffinityMaps(input: {
  favorites?: Favorite[];
  cartItems?: CartItem[];
  orders?: Order[];
  productCategoryById?: Map<string, string>;
}): CategoryAffinityMaps {
  const favorites = new Map<string, number>();
  const cart = new Map<string, number>();
  const orders = new Map<string, number>();

  for (const fav of input.favorites ?? []) {
    const categoryId = fav.product?.categoryId ?? fav.product?.category?.id;
    if (!categoryId) continue;
    favorites.set(categoryId, (favorites.get(categoryId) ?? 0) + 1);
  }

  for (const item of input.cartItems ?? []) {
    const categoryId = item.product?.categoryId ?? item.product?.category?.id;
    if (!categoryId) continue;
    cart.set(categoryId, (cart.get(categoryId) ?? 0) + item.quantity);
  }

  const categoryLookup = input.productCategoryById ?? new Map<string, string>();
  for (const order of input.orders ?? []) {
    for (const item of order.items) {
      const categoryId = categoryLookup.get(item.productId);
      if (!categoryId) continue;
      orders.set(categoryId, (orders.get(categoryId) ?? 0) + item.quantity);
    }
  }

  return { favorites, cart, orders };
}

export function hasBehavioralCategoryData(maps: CategoryAffinityMaps): boolean {
  const total =
    Array.from(maps.favorites.values()).reduce((a, b) => a + b, 0) +
    Array.from(maps.cart.values()).reduce((a, b) => a + b, 0) +
    Array.from(maps.orders.values()).reduce((a, b) => a + b, 0);
  return total >= 2;
}

function scoreCategory(
  category: Category,
  maps: CategoryAffinityMaps,
  useBehavior: boolean,
): number {
  const productCount = category._count?.products ?? 0;
  if (!useBehavior) {
    return productCount;
  }

  return (
    (maps.favorites.get(category.id) ?? 0) * 3 +
    (maps.cart.get(category.id) ?? 0) * 2 +
    (maps.orders.get(category.id) ?? 0) * 1 +
    productCount * 0.001
  );
}

/**
 * Deterministic smart category ordering.
 * Guest/new users: product availability (count), then name.
 * Returning users: favorites/cart/orders affinity when sufficient data exists.
 */
export function getSmartCategories(
  categories: Category[],
  affinityMaps?: CategoryAffinityMaps,
  maxCount = SMART_CATEGORY_TARGET,
): Category[] {
  const eligible = categories.filter(
    (c) => !c.parentId && (c._count?.products ?? 0) > 0,
  );

  const useBehavior = affinityMaps ? hasBehavioralCategoryData(affinityMaps) : false;

  return [...eligible]
    .sort((a, b) => {
      const scoreDiff =
        scoreCategory(b, affinityMaps ?? { favorites: new Map(), cart: new Map(), orders: new Map() }, useBehavior) -
        scoreCategory(a, affinityMaps ?? { favorites: new Map(), cart: new Map(), orders: new Map() }, useBehavior);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name, 'ar');
    })
    .slice(0, maxCount);
}
