import type { QueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import type { CartItem, CartResponse, Product, ProductVariant } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { recalcCartSummaryFromItems } from '@/lib/optimistic-free-delivery';

export type CartQueryKey = readonly ['cart', string];

export function buildCartQueryKey(
  areasReady: boolean,
  deliveryAreaId: string | null,
): CartQueryKey {
  return ['cart', areasReady ? (deliveryAreaId ?? '') : '__pending__'];
}

export function isOptimisticCartItemId(itemId: string): boolean {
  return itemId.startsWith('optimistic-');
}

function buildAddKey(productId: string, variantId?: string | null): string {
  return `${productId}:${variantId ?? ''}`;
}

function stubProduct(productId: string, product?: Product): Product {
  if (product) return product;
  return {
    id: productId,
    name: '',
    description: '',
    price: 0,
    freeDeliveryValue: 0,
    availability: 'UNLIMITED',
    stock: 0,
    isAvailable: true,
    isActive: true,
    isRecommended: false,
    images: [],
  };
}

/** Latest target quantity per real cart item while clicks are being synced */
const pendingQuantity = new Map<string, number>();
const flushPromises = new Map<string, Promise<void>>();

/** Pending add-to-cart quantities keyed by product:variant */
const pendingAddQuantity = new Map<string, number>();
const pendingAddTempIds = new Map<string, string>();
const addFlushPromises = new Map<string, Promise<void>>();

export function getEffectiveCartItemQuantity(
  qc: QueryClient,
  queryKey: CartQueryKey,
  itemId: string,
): number | null {
  if (pendingQuantity.has(itemId)) {
    return pendingQuantity.get(itemId)!;
  }
  const addKey = findAddKeyForTempItemId(itemId);
  if (addKey && pendingAddQuantity.has(addKey)) {
    return pendingAddQuantity.get(addKey)!;
  }
  const cart = qc.getQueryData<CartResponse>(queryKey);
  return cart?.items.find((i) => i.id === itemId)?.quantity ?? null;
}

function findAddKeyForTempItemId(itemId: string): string | null {
  for (const [key, tempId] of Array.from(pendingAddTempIds.entries())) {
    if (tempId === itemId) return key;
  }
  if (isOptimisticCartItemId(itemId)) {
    return itemId.slice('optimistic-'.length);
  }
  return null;
}

function findRealCartLine(
  cart: CartResponse | undefined,
  productId: string,
  variantId?: string | null,
) {
  return cart?.items.find(
    (i) =>
      i.productId === productId &&
      (i.variantId ?? null) === (variantId ?? null) &&
      !isOptimisticCartItemId(i.id),
  );
}

export function patchCartItemQuantity(
  qc: QueryClient,
  queryKey: CartQueryKey,
  itemId: string,
  quantity: number,
) {
  qc.setQueryData<CartResponse>(queryKey, (old) => {
    if (!old) return old;

    let items: CartItem[];
    if (quantity <= 0) {
      items = old.items.filter((i) => i.id !== itemId);
    } else {
      items = old.items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
    }

    const summary = recalcCartSummaryFromItems(qc, items, old.summary);
    return { ...old, items, summary };
  });
}

function patchCartWithNewItem(
  qc: QueryClient,
  queryKey: CartQueryKey,
  tempId: string,
  productId: string,
  variantId: string | undefined,
  quantity: number,
  product?: Product,
  variant?: ProductVariant,
) {
  qc.setQueryData<CartResponse>(queryKey, (old) => {
    const newItem: CartItem = {
      id: tempId,
      quantity,
      productId,
      variantId: variantId ?? null,
      product: stubProduct(productId, product),
      variant: variant ?? null,
    };

    if (!old) {
      const items = [newItem];
      const summary = recalcCartSummaryFromItems(qc, items);
      return { items, summary };
    }

    const items = [
      ...old.items.filter(
        (i) =>
          !(
            isOptimisticCartItemId(i.id) &&
            i.productId === productId &&
            (i.variantId ?? null) === (variantId ?? null)
          ),
      ),
      newItem,
    ];

    const summary = recalcCartSummaryFromItems(qc, items, old.summary);
    return { ...old, items, summary };
  });
}

function replaceOptimisticItemWithReal(
  qc: QueryClient,
  queryKey: CartQueryKey,
  addKey: string,
  apiItem: CartItem,
): { itemId: string; desiredQty: number; apiQty: number } | null {
  const tempId = pendingAddTempIds.get(addKey);

  let desiredQty = apiItem.quantity;

  qc.setQueryData<CartResponse>(queryKey, (old) => {
    if (!old) return old;

    const tempItem = tempId ? old.items.find((i) => i.id === tempId) : undefined;
    desiredQty = tempItem?.quantity ?? apiItem.quantity;

    let items = old.items.filter((i) => i.id !== tempId);

    const existingIdx = items.findIndex(
      (i) =>
        i.productId === apiItem.productId &&
        (i.variantId ?? null) === (apiItem.variantId ?? null),
    );

    if (existingIdx >= 0) {
      items = items.map((i, idx) =>
        idx === existingIdx ? { ...apiItem, quantity: desiredQty } : i,
      );
    } else {
      items = [...items, { ...apiItem, quantity: desiredQty }];
    }

    return {
      ...old,
      items,
      summary: recalcCartSummaryFromItems(qc, items, old.summary),
    };
  });

  pendingAddTempIds.delete(addKey);

  const cart = qc.getQueryData<CartResponse>(queryKey);
  const realItem = findRealCartLine(cart, apiItem.productId, apiItem.variantId);
  if (!realItem) return null;

  return { itemId: realItem.id, desiredQty, apiQty: apiItem.quantity };
}

function rollbackOptimisticAdd(qc: QueryClient, queryKey: CartQueryKey, addKey: string) {
  const tempId = pendingAddTempIds.get(addKey);
  if (tempId) {
    patchCartItemQuantity(qc, queryKey, tempId, 0);
  }
  pendingAddQuantity.delete(addKey);
  pendingAddTempIds.delete(addKey);
}

type SyncContext = {
  qc: QueryClient;
  queryKey: CartQueryKey;
  onError: (message: string) => void;
  onAddSuccess?: () => void;
};

function prepareOptimisticCartWrite(qc: QueryClient, queryKey: CartQueryKey) {
  void qc.cancelQueries({ queryKey: [...queryKey] });
}

function scheduleBackgroundCartRefresh(qc: QueryClient, queryKey: CartQueryKey) {
  void qc.invalidateQueries({
    queryKey: [...queryKey],
    refetchType: 'active',
  });
}

async function flushCartItemQuantity(itemId: string, ctx: SyncContext) {
  while (pendingQuantity.has(itemId)) {
    const quantity = pendingQuantity.get(itemId)!;
    pendingQuantity.delete(itemId);

    try {
      if (quantity <= 0) {
        await storeApi.removeCartItem(itemId);
      } else {
        await storeApi.updateCartItem(itemId, quantity);
      }
      if (!pendingQuantity.has(itemId)) {
        patchCartItemQuantity(ctx.qc, ctx.queryKey, itemId, quantity);
      }
    } catch (error) {
      pendingQuantity.delete(itemId);
      ctx.onError(getErrorMessage(error));
      scheduleBackgroundCartRefresh(ctx.qc, ctx.queryKey);
      return;
    }
  }

  scheduleBackgroundCartRefresh(ctx.qc, ctx.queryKey);
}

async function flushAddToCart(
  addKey: string,
  productId: string,
  variantId: string | undefined,
  ctx: SyncContext,
) {
  while (pendingAddQuantity.has(addKey)) {
    const quantity = pendingAddQuantity.get(addKey)!;
    pendingAddQuantity.delete(addKey);

    if (quantity <= 0) {
      rollbackOptimisticAdd(ctx.qc, ctx.queryKey, addKey);
      continue;
    }

    try {
      const apiItem = await storeApi.addToCart(productId, quantity, variantId);
      const replaced = replaceOptimisticItemWithReal(ctx.qc, ctx.queryKey, addKey, apiItem);
      ctx.onAddSuccess?.();

      if (replaced && replaced.desiredQty !== replaced.apiQty) {
        setCartItemQuantityOptimistic(replaced.itemId, replaced.desiredQty, ctx);
      }

      if (pendingAddQuantity.has(addKey)) {
        continue;
      }
    } catch (error) {
      rollbackOptimisticAdd(ctx.qc, ctx.queryKey, addKey);
      ctx.onError(getErrorMessage(error));
      scheduleBackgroundCartRefresh(ctx.qc, ctx.queryKey);
      return;
    }
  }

  scheduleBackgroundCartRefresh(ctx.qc, ctx.queryKey);
}

function scheduleAddFlush(
  addKey: string,
  productId: string,
  variantId: string | undefined,
  ctx: SyncContext,
) {
  if (!addFlushPromises.has(addKey)) {
    const promise = flushAddToCart(addKey, productId, variantId, ctx).finally(() => {
      addFlushPromises.delete(addKey);
    });
    addFlushPromises.set(addKey, promise);
  }
}

function adjustOptimisticAddQuantity(
  itemId: string,
  delta: number,
  ctx: SyncContext,
): number | null {
  const addKey = findAddKeyForTempItemId(itemId);
  if (!addKey) return null;

  const [productId, variantPart] = addKey.split(':');
  const variantId = variantPart || undefined;

  const current =
    pendingAddQuantity.get(addKey) ??
    getEffectiveCartItemQuantity(ctx.qc, ctx.queryKey, itemId) ??
    0;
  const next = current + delta;

  if (next <= 0) {
    pendingAddQuantity.set(addKey, 0);
    patchCartItemQuantity(ctx.qc, ctx.queryKey, itemId, 0);
    scheduleAddFlush(addKey, productId, variantId, ctx);
    return 0;
  }

  pendingAddQuantity.set(addKey, next);
  patchCartItemQuantity(ctx.qc, ctx.queryKey, itemId, next);
  scheduleAddFlush(addKey, productId, variantId, ctx);
  return next;
}

export function addToCartOptimistic(
  productId: string,
  quantity: number,
  variantId: string | undefined,
  product: Product | undefined,
  variant: ProductVariant | undefined,
  ctx: SyncContext,
): string {
  prepareOptimisticCartWrite(ctx.qc, ctx.queryKey);
  const addKey = buildAddKey(productId, variantId);
  const cart = ctx.qc.getQueryData<CartResponse>(ctx.queryKey);

  const existingReal = findRealCartLine(cart, productId, variantId);
  if (existingReal) {
    adjustCartItemQuantityOptimistic(existingReal.id, quantity, ctx);
    return existingReal.id;
  }

  const existingOptimistic = cart?.items.find(
    (i) =>
      isOptimisticCartItemId(i.id) &&
      i.productId === productId &&
      (i.variantId ?? null) === (variantId ?? null),
  );

  if (existingOptimistic) {
    const nextQty = (pendingAddQuantity.get(addKey) ?? existingOptimistic.quantity) + quantity;
    pendingAddQuantity.set(addKey, nextQty);
    patchCartItemQuantity(ctx.qc, ctx.queryKey, existingOptimistic.id, nextQty);
    scheduleAddFlush(addKey, productId, variantId, ctx);
    return existingOptimistic.id;
  }

  const tempId = `optimistic-${addKey}`;
  pendingAddTempIds.set(addKey, tempId);
  const nextQty = (pendingAddQuantity.get(addKey) ?? 0) + quantity;
  pendingAddQuantity.set(addKey, nextQty);
  patchCartWithNewItem(
    ctx.qc,
    ctx.queryKey,
    tempId,
    productId,
    variantId,
    nextQty,
    product,
    variant,
  );
  scheduleAddFlush(addKey, productId, variantId, ctx);
  return tempId;
}

export function setCartItemQuantityOptimistic(
  itemId: string,
  quantity: number,
  ctx: SyncContext,
) {
  prepareOptimisticCartWrite(ctx.qc, ctx.queryKey);

  if (isOptimisticCartItemId(itemId)) {
    const addKey = findAddKeyForTempItemId(itemId);
    if (!addKey) return;
    const [productId, variantPart] = addKey.split(':');
    const variantId = variantPart || undefined;
    pendingAddQuantity.set(addKey, quantity);
    patchCartItemQuantity(ctx.qc, ctx.queryKey, itemId, quantity);
    scheduleAddFlush(addKey, productId, variantId, ctx);
    return;
  }

  pendingQuantity.set(itemId, quantity);
  patchCartItemQuantity(ctx.qc, ctx.queryKey, itemId, quantity);

  if (!flushPromises.has(itemId)) {
    const promise = flushCartItemQuantity(itemId, ctx).finally(() => {
      flushPromises.delete(itemId);
    });
    flushPromises.set(itemId, promise);
  }
}

export function adjustCartItemQuantityOptimistic(
  itemId: string,
  delta: number,
  ctx: SyncContext,
): number | null {
  if (isOptimisticCartItemId(itemId)) {
    return adjustOptimisticAddQuantity(itemId, delta, ctx);
  }

  const current = getEffectiveCartItemQuantity(ctx.qc, ctx.queryKey, itemId);
  if (current == null) return null;
  const next = current + delta;
  setCartItemQuantityOptimistic(itemId, next, ctx);
  return next;
}
