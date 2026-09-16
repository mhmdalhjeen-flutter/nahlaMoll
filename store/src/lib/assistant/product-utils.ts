import type { Product, ProductVariant } from '@/lib/types';
import { isProductPurchasable } from '@/lib/free-delivery';
import { calculateUnitPrice } from '@/lib/product-meta';

/** Cheapest purchasable variant for pricing/stock checks. */
export function getBestPurchasableVariant(
  product: Product,
): { variant?: ProductVariant; unitPrice: number } | null {
  if (!isProductPurchasable(product)) return null;

  const variants = product.variants ?? [];
  if (variants.length === 0) {
    const { unitPrice } = calculateUnitPrice(product);
    return { unitPrice };
  }

  let best: { variant: ProductVariant; unitPrice: number } | null = null;
  for (const variant of variants) {
    if (variant.stock <= 0) continue;
    const { unitPrice } = calculateUnitPrice(product, Number(variant.priceAdjustment));
    if (!best || unitPrice < best.unitPrice) {
      best = { variant, unitPrice };
    }
  }
  return best;
}

export function filterPurchasableProducts(products: Product[]): Product[] {
  return products.filter((p) => isProductPurchasable(p));
}

const NAME_EMOJI: Array<{ pattern: RegExp; emoji: string }> = [
  { pattern: /خيار|كوسا/, emoji: '🥒' },
  { pattern: /بندور|طماط|طماطم/, emoji: '🍅' },
  { pattern: /جزر/, emoji: '🥕' },
  { pattern: /بطاط/, emoji: '🥔' },
  { pattern: /خس|جرجير/, emoji: '🥬' },
  { pattern: /بصل/, emoji: '🧅' },
  { pattern: /ثوم/, emoji: '🧄' },
  { pattern: /فلفل/, emoji: '🫑' },
  { pattern: /باذنج/, emoji: '🍆' },
  { pattern: /تفاح/, emoji: '🍎' },
  { pattern: /موز/, emoji: '🍌' },
  { pattern: /برتق/, emoji: '🍊' },
  { pattern: /عنب/, emoji: '🍇' },
  { pattern: /فراول/, emoji: '🍓' },
  { pattern: /كيوي/, emoji: '🥝' },
  { pattern: /مانج/, emoji: '🥭' },
  { pattern: /أرز|ارز/, emoji: '🍚' },
  { pattern: /دجاج/, emoji: '🍗' },
  { pattern: /لحم/, emoji: '🥩' },
  { pattern: /سماع/, emoji: '🎧' },
  { pattern: /شاحن/, emoji: '🔌' },
  { pattern: /هاتف|موبايل|جوال/, emoji: '📱' },
  { pattern: /لبن|حليب/, emoji: '🥛' },
  { pattern: /جبن/, emoji: '🧀' },
  { pattern: /بيض/, emoji: '🥚' },
  { pattern: /خبز/, emoji: '🍞' },
  { pattern: /زيت/, emoji: '🫒' },
  { pattern: /بهار/, emoji: '🧂' },
  { pattern: /شاي/, emoji: '🍵' },
  { pattern: /قهو/, emoji: '☕' },
];

export function emojiForProductName(name: string): string {
  for (const { pattern, emoji } of NAME_EMOJI) {
    if (pattern.test(name)) return emoji;
  }
  return '🛒';
}

export function uniqueProductsById(products: Product[]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of products) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}
