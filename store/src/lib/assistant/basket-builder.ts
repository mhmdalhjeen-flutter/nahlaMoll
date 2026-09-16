import type { Product } from '@/lib/types';
import { getFreeDeliveryContribution } from '@/lib/free-delivery';
import { getBestPurchasableVariant, uniqueProductsById } from './product-utils';

export type BasketGoal =
  | 'variety'
  | 'value'
  | 'max_variety'
  | 'free_delivery'
  | 'gift'
  | 'household';

export interface BasketCriteria {
  budget: number;
  goal: BasketGoal;
  categoryId?: string;
  categoryKeywords?: string[];
  themeId?: string;
}

export interface BasketLine {
  productId: string;
  product: Product;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BasketSuggestion {
  id: string;
  title: string;
  emoji: string;
  lines: BasketLine[];
  total: number;
  note?: string;
}

const BUDGET_TOLERANCE = 1.08;

export function parseBudget(text: string): number | null {
  const patterns = [
    /(\d+)\s*(?:شيكل|₪|ش\b)/i,
    /(?:ب(?:ـ|-)?)\s*(\d+)/i,
    /(?:بـ)\s*(\d+)/i,
    /(?:ب\s+)(\d+)/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export function parseBasketGoal(text: string): BasketGoal {
  if (/أرخص|اوفر|أوفر|ارخص|اقل\s*سعر/i.test(text)) return 'value';
  if (/أكثر\s*تشكيل|تشكيلة\s*كبير|max/i.test(text)) return 'max_variety';
  if (/توصيل\s*مجاني|اكمل\s*التوصيل|أكمل\s*التوصيل/i.test(text)) return 'free_delivery';
  if (/هدية|هديه/i.test(text)) return 'gift';
  if (/للبيت|البيت|منزل/i.test(text)) return 'household';
  return 'variety';
}

export function parseBasketCategoryKeywords(text: string): string[] {
  const keywords: string[] = [];
  if (/فواكه|فاكه/i.test(text)) keywords.push('فواكه');
  if (/خضار|خضرو/i.test(text)) keywords.push('خضار');
  if (/إلكترون|الكترون|سماع/i.test(text)) keywords.push('إلكترونيات');
  if (/منزل|بيت/i.test(text)) keywords.push('منزل');
  if (/ملابس/i.test(text)) keywords.push('ملابس');
  return keywords;
}

export function isBasketBuilderQuery(text: string): boolean {
  const budget = parseBudget(text);
  if (!budget) return false;
  return (
    /(سلة|تشكيلة|تشكيله|أغراض|اغراض|منتجات)/i.test(text) ||
    /(بدي|اريد|أريد)\s/.test(text)
  );
}

interface PricedProduct {
  product: Product;
  variantId?: string;
  unitPrice: number;
  fdScore: number;
}

function toPricedProducts(products: Product[]): PricedProduct[] {
  const out: PricedProduct[] = [];
  for (const product of products) {
    const best = getBestPurchasableVariant(product);
    if (!best) continue;
    const fd = getFreeDeliveryContribution(product.freeDeliveryValue) ?? 0;
    out.push({
      product,
      variantId: best.variant?.id,
      unitPrice: best.unitPrice,
      fdScore: fd,
    });
  }
  return out;
}

function buildLines(
  picks: Array<{ item: PricedProduct; qty: number }>,
): BasketLine[] {
  return picks.map(({ item, qty }) => ({
    productId: item.product.id,
    product: item.product,
    variantId: item.variantId,
    quantity: qty,
    unitPrice: item.unitPrice,
    lineTotal: Math.round(item.unitPrice * qty * 100) / 100,
  }));
}

function sumTotal(lines: BasketLine[]): number {
  return Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
}

function greedyVarietyBasket(
  pool: PricedProduct[],
  budget: number,
  maxItems: number,
): BasketLine[] {
  const sorted = [...pool].sort((a, b) => a.unitPrice - b.unitPrice);
  const picks: Array<{ item: PricedProduct; qty: number }> = [];
  let total = 0;
  const used = new Set<string>();

  for (const item of sorted) {
    if (picks.length >= maxItems) break;
    if (used.has(item.product.id)) continue;
    if (item.unitPrice > budget * BUDGET_TOLERANCE) continue;
    if (total + item.unitPrice > budget * BUDGET_TOLERANCE) continue;
    picks.push({ item, qty: 1 });
    used.add(item.product.id);
    total += item.unitPrice;
  }

  return buildLines(picks);
}

function greedyValueBasket(pool: PricedProduct[], budget: number): BasketLine[] {
  const sorted = [...pool].sort((a, b) => a.unitPrice - b.unitPrice);
  const picks: Array<{ item: PricedProduct; qty: number }> = [];
  let total = 0;

  for (const item of sorted) {
    if (item.unitPrice > budget) continue;
    let qty = Math.floor((budget - total) / item.unitPrice);
    if (qty < 1) continue;
    qty = Math.min(qty, 3);
    const lineTotal = item.unitPrice * qty;
    if (total + lineTotal > budget * BUDGET_TOLERANCE) {
      qty = 1;
      if (total + item.unitPrice > budget * BUDGET_TOLERANCE) continue;
    }
    picks.push({ item, qty });
    total += item.unitPrice * qty;
    if (total >= budget * 0.85) break;
  }

  return buildLines(picks);
}

function greedyFreeDeliveryBasket(
  pool: PricedProduct[],
  budget: number,
  remainingScore?: number,
): BasketLine[] {
  const sorted = [...pool].sort((a, b) => {
    const aScore = a.fdScore * 2 - a.unitPrice * 0.01;
    const bScore = b.fdScore * 2 - b.unitPrice * 0.01;
    return bScore - aScore;
  });
  const lines = greedyVarietyBasket(sorted, budget, 6);
  if (remainingScore != null && remainingScore > 0 && lines.length > 0) {
    return lines;
  }
  return lines;
}

function giftRank(a: PricedProduct, b: PricedProduct): number {
  const aRec = a.product.isRecommended ? 1 : 0;
  const bRec = b.product.isRecommended ? 1 : 0;
  if (aRec !== bRec) return bRec - aRec;
  return a.unitPrice - b.unitPrice;
}

export function buildBasketSuggestions(
  products: Product[],
  criteria: BasketCriteria,
  options?: { remainingScore?: number; displayProgress?: number },
): BasketSuggestion[] {
  const pool = toPricedProducts(uniqueProductsById(products));
  if (pool.length === 0) return [];

  const { budget, goal } = criteria;
  const suggestions: BasketSuggestion[] = [];

  const varietyLines = greedyVarietyBasket(pool, budget, 5);
  if (varietyLines.length > 0) {
    suggestions.push({
      id: 'variety',
      title: 'سلة متنوعة',
      emoji: '🍎',
      lines: varietyLines,
      total: sumTotal(varietyLines),
    });
  }

  const valueLines = greedyValueBasket(pool, budget);
  if (valueLines.length > 0 && goal !== 'variety') {
    suggestions.push({
      id: 'value',
      title: 'سلة أفضل قيمة',
      emoji: '💰',
      lines: valueLines,
      total: sumTotal(valueLines),
    });
  } else if (valueLines.length > 0 && suggestions.length < 3) {
    suggestions.push({
      id: 'value',
      title: 'سلة أفضل قيمة',
      emoji: '💰',
      lines: valueLines,
      total: sumTotal(valueLines),
    });
  }

  const maxVarietyPool = [...pool].sort((a, b) => a.unitPrice - b.unitPrice);
  const maxLines = greedyVarietyBasket(maxVarietyPool, budget, 8);
  if (maxLines.length > (varietyLines.length || 0) && suggestions.length < 5) {
    suggestions.push({
      id: 'max_variety',
      title: 'أكثر تشكيلة ممكنة',
      emoji: '🧺',
      lines: maxLines,
      total: sumTotal(maxLines),
    });
  }

  if (goal === 'free_delivery' || options?.remainingScore) {
    const fdLines = greedyFreeDeliveryBasket(pool, budget, options?.remainingScore);
    if (fdLines.length > 0) {
      suggestions.push({
        id: 'free_delivery',
        title: 'سلة تساعدك على التوصيل المجاني',
        emoji: '🚚',
        lines: fdLines,
        total: sumTotal(fdLines),
        note: '🚚 هاي السلة ضمن ميزانيتك، وكمان ممكن تساعدك تكمل التوصيل المجاني.',
      });
    }
  }

  if (goal === 'gift') {
    const giftPool = [...pool].sort(giftRank);
    const giftLines = greedyVarietyBasket(giftPool, budget, 4);
    if (giftLines.length > 0) {
      suggestions.push({
        id: 'gift',
        title: 'سلة هدية',
        emoji: '🎁',
        lines: giftLines,
        total: sumTotal(giftLines),
      });
    }
  }

  const deduped: BasketSuggestion[] = [];
  const seenTotals = new Set<string>();
  for (const s of suggestions) {
    const key = `${s.total}-${s.lines.map((l) => l.productId).join(',')}`;
    if (seenTotals.has(key)) continue;
    seenTotals.add(key);
    deduped.push(s);
  }

  return deduped.slice(0, 5);
}
