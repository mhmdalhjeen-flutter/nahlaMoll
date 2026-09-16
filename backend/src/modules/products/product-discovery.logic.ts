import type { CustomerAffinityProfile } from "../customer-intelligence/customer-intelligence.types";

export const MIN_SECTION_PRODUCTS = 2;
export const DEFAULT_SECTION_LIMIT = 8;
export const AGGREGATE_FETCH_BUFFER = 40;
/** Skip a section when it would mostly duplicate a higher-priority section and alternatives exist. */
export const MAX_SECTION_OVERLAP = 0.75;

export const RECOMMENDATION_REASONS = {
  category_affinity: (label: string) => `لأنك تهتم بـ${label}`,
  search_match: (term: string) => `لأنك بحثت عن «${term}»`,
  tag_affinity: "لأنك أضفت منتجات مشابهة للمفضلة",
  purchase_similar: "لأنك اشتريت منتجات مشابهة",
  recent_interest: "بناءً على اهتماماتك الأخيرة",
  popular: "شائع بين العملاء",
  free_delivery: "يساعدك في إكمال التوصيل المجاني",
  admin_pick: "منتج موصى به من المتجر",
} as const;

export type RecommendationReasonKey = keyof typeof RECOMMENDATION_REASONS;

export interface IntelligenceScoringContext {
  categoryScores: Map<
    string,
    { score: number; recentScore: number; label?: string }
  >;
  tagScores: Map<string, { score: number; recentScore: number }>;
  searchTerms: Array<{ term: string; score: number; recentScore: number }>;
  purchasedProductIds: Set<string>;
  interactedProductIds: Set<string>;
  hasPurchaseHistory: boolean;
}

export interface ProductRankingSignals {
  orderQuantity?: number;
  favoriteCount?: number;
  averageRating?: number;
  reviewCount?: number;
}

export interface DiscoveryProductCandidate {
  id: string;
  categoryId: string;
  name: string;
  tags: string[];
  isRecommended: boolean;
  freeDeliveryValue: number;
  hasActiveOffer?: boolean;
}

export interface RankedDiscoveryProduct {
  productId: string;
  categoryId: string;
  score: number;
  reasonKey: RecommendationReasonKey;
  reason: string;
}

export interface ScoreBreakdown {
  score: number;
  reasonKey: RecommendationReasonKey;
  reasonLabel?: string;
  searchTerm?: string;
}

export function overlapRatio(
  existing: Set<string>,
  candidateIds: string[],
): number {
  if (candidateIds.length === 0) return 0;
  const overlap = candidateIds.filter((id) => existing.has(id)).length;
  return overlap / candidateIds.length;
}

export function pickUniqueIds(
  rankedIds: (string | null | undefined)[],
  exclude: Set<string>,
  limit: number,
): string[] {
  const picked: string[] = [];
  for (const id of rankedIds) {
    if (!id || exclude.has(id)) continue;
    picked.push(id);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function shouldIncludeSection(
  productIds: string[],
  shownProductIds: Set<string>,
  poolSize: number,
): boolean {
  if (productIds.length < MIN_SECTION_PRODUCTS) return false;
  if (shownProductIds.size === 0) return true;

  const ratio = overlapRatio(shownProductIds, productIds);
  const enoughAlternatives =
    poolSize > productIds.length + shownProductIds.size;

  if (ratio >= MAX_SECTION_OVERLAP && enoughAlternatives) {
    return false;
  }

  return true;
}

export function scoreCategoryAffinity(
  categoryScores:
    Map<string, number> | IntelligenceScoringContext["categoryScores"],
  categoryId: string,
  siblingCategoryIds: Set<string>,
): number {
  const entry = categoryScores.get(categoryId);
  const base =
    typeof entry === "number"
      ? entry
      : (entry?.score ?? 0) + (entry?.recentScore ?? 0) * 1.5;
  let score = base;
  if (siblingCategoryIds.has(categoryId)) {
    score += 1;
  }
  return score;
}

export function scoreTagOverlap(
  productTags: string[],
  interestTags: Set<string> | IntelligenceScoringContext["tagScores"],
): number {
  if (interestTags instanceof Set) {
    if (interestTags.size === 0) return 0;
    return productTags.filter((tag) => interestTags.has(tag.toLowerCase()))
      .length;
  }

  if (interestTags.size === 0) return 0;
  return productTags.reduce((sum, tag) => {
    const entry = interestTags.get(tag.toLowerCase());
    if (!entry) return sum;
    return sum + entry.score + entry.recentScore * 1.5;
  }, 0);
}

export function scoreFreeDeliveryBoost(input: {
  contribution: number;
  remainingScore: number;
  sameCategory: boolean;
  categoryAffinity: number;
  intelligenceAffinity?: number;
}): number {
  const {
    contribution,
    remainingScore,
    sameCategory,
    categoryAffinity,
    intelligenceAffinity = 0,
  } = input;
  let score = Math.max(categoryAffinity, intelligenceAffinity);

  if (sameCategory) score += 3;
  if (contribution > 0) score += 2;

  if (remainingScore > 0 && contribution >= remainingScore * 0.5) {
    score += 1.5;
  }

  score += contribution / 100;
  return score;
}

export function buildIntelligenceScoringContext(
  profile: CustomerAffinityProfile,
): IntelligenceScoringContext {
  const categoryScores = new Map<
    string,
    { score: number; recentScore: number; label?: string }
  >();
  for (const entry of profile.categories) {
    categoryScores.set(entry.id, {
      score: entry.score,
      recentScore: entry.recentScore,
      label: entry.label,
    });
  }

  const tagScores = new Map<string, { score: number; recentScore: number }>();
  for (const entry of profile.tags) {
    tagScores.set(entry.id, {
      score: entry.score,
      recentScore: entry.recentScore,
    });
  }

  const searchTerms = profile.searches.map((s) => ({
    term: s.id,
    score: s.score,
    recentScore: s.recentScore,
  }));

  const purchasedProductIds = new Set<string>();
  const interactedProductIds = new Set<string>();

  for (const product of profile.products) {
    interactedProductIds.add(product.id);
    const purchased = product.reasons.some((r) => r.includes("Purchased"));
    if (purchased) purchasedProductIds.add(product.id);
  }

  return {
    categoryScores,
    tagScores,
    searchTerms,
    purchasedProductIds,
    interactedProductIds,
    hasPurchaseHistory: purchasedProductIds.size > 0,
  };
}

function normalizeArabicSearch(term: string): string {
  return term.trim().toLowerCase();
}

function productMatchesSearch(
  product: DiscoveryProductCandidate,
  searchTerms: IntelligenceScoringContext["searchTerms"],
): { score: number; term: string } | null {
  const name = product.name.toLowerCase();
  const tags = product.tags.map((t) => t.toLowerCase());

  let best: { score: number; term: string } | null = null;
  for (const search of searchTerms) {
    const term = normalizeArabicSearch(search.term);
    if (term.length < 2) continue;
    const matches =
      name.includes(term) ||
      tags.some((tag) => tag.includes(term) || term.includes(tag));
    if (!matches) continue;
    const weight = search.score + search.recentScore * 1.5;
    if (!best || weight > best.score) {
      best = { score: weight, term: search.term };
    }
  }
  return best;
}

export function buildRecommendationReason(
  reasonKey: RecommendationReasonKey,
  options?: { categoryLabel?: string; searchTerm?: string },
): string {
  if (reasonKey === "category_affinity" && options?.categoryLabel) {
    return RECOMMENDATION_REASONS.category_affinity(options.categoryLabel);
  }
  if (reasonKey === "search_match" && options?.searchTerm) {
    return RECOMMENDATION_REASONS.search_match(options.searchTerm);
  }
  const reason = RECOMMENDATION_REASONS[reasonKey];
  return typeof reason === "function" ? reason("") : reason;
}

export function scorePersonalizedCandidate(
  product: DiscoveryProductCandidate,
  intelligence: IntelligenceScoringContext,
  signals: ProductRankingSignals,
  siblingCategoryIds: Set<string>,
): ScoreBreakdown {
  const contributions: Array<{
    key: RecommendationReasonKey;
    weight: number;
    label?: string;
    searchTerm?: string;
  }> = [];

  let score = 0;

  const categoryEntry = intelligence.categoryScores.get(product.categoryId);
  if (categoryEntry) {
    const catScore = categoryEntry.score + categoryEntry.recentScore * 1.5;
    const weighted = catScore * 2;
    score += weighted;
    contributions.push({
      key: "category_affinity",
      weight: weighted,
      label: categoryEntry.label,
    });
  } else if (siblingCategoryIds.has(product.categoryId)) {
    score += 1.5;
    contributions.push({ key: "recent_interest", weight: 1.5 });
  }

  const tagScore = scoreTagOverlap(
    product.tags.map((t) => t.toLowerCase()),
    intelligence.tagScores,
  );
  if (tagScore > 0) {
    const weighted = tagScore * 2;
    score += weighted;
    contributions.push({
      key: intelligence.hasPurchaseHistory
        ? "purchase_similar"
        : "tag_affinity",
      weight: weighted,
    });
  }

  const searchMatch = productMatchesSearch(product, intelligence.searchTerms);
  if (searchMatch) {
    const weighted = searchMatch.score * 2.5;
    score += weighted;
    contributions.push({
      key: "search_match",
      weight: weighted,
      searchTerm: searchMatch.term,
    });
  }

  if (categoryEntry && categoryEntry.recentScore > 0 && score > 0) {
    score += categoryEntry.recentScore * 0.5;
  }

  const orderQty = signals.orderQuantity ?? 0;
  if (orderQty > 0) {
    const popScore = Math.min(Math.log10(orderQty + 1) * 2, 4);
    score += popScore;
    contributions.push({ key: "popular", weight: popScore });
  }

  const favCount = signals.favoriteCount ?? 0;
  if (favCount > 0) {
    score += Math.min(favCount * 0.5, 2);
  }

  if ((signals.reviewCount ?? 0) >= 2 && (signals.averageRating ?? 0) >= 4) {
    score += (signals.averageRating ?? 0) * 0.5;
  }

  if (product.isRecommended) {
    score += 2;
    contributions.push({ key: "admin_pick", weight: 2 });
  }

  if (product.hasActiveOffer) {
    score += 0.5;
  }

  score += Number(product.freeDeliveryValue ?? 0) / 200;

  contributions.sort((a, b) => b.weight - a.weight);
  const top = contributions[0] ?? { key: "popular" as const, weight: 0 };

  return {
    score,
    reasonKey: top.key,
    reasonLabel: top.label,
    searchTerm: top.searchTerm,
  };
}

export function rankPersonalizedCandidates(
  candidates: DiscoveryProductCandidate[],
  intelligence: IntelligenceScoringContext,
  signalsByProduct: Map<string, ProductRankingSignals>,
  siblingCategoryIds: Set<string>,
  limit: number,
): RankedDiscoveryProduct[] {
  const scored = candidates
    .filter((p) => !intelligence.purchasedProductIds.has(p.id))
    .map((product) => {
      const breakdown = scorePersonalizedCandidate(
        product,
        intelligence,
        signalsByProduct.get(product.id) ?? {},
        siblingCategoryIds,
      );
      return {
        productId: product.id,
        categoryId: product.categoryId,
        score: breakdown.score,
        reasonKey: breakdown.reasonKey,
        reason: buildRecommendationReason(breakdown.reasonKey, {
          categoryLabel: breakdown.reasonLabel,
          searchTerm: breakdown.searchTerm,
        }),
      };
    })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.productId.localeCompare(b.productId),
    );

  return selectDiverseProducts(scored, limit);
}

export function selectDiverseProducts(
  ranked: RankedDiscoveryProduct[],
  limit: number,
): RankedDiscoveryProduct[] {
  const pool = [...ranked];
  const picked: RankedDiscoveryProduct[] = [];
  const categoryCounts = new Map<string, number>();

  while (picked.length < limit && pool.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const penalty = (categoryCounts.get(candidate.categoryId) ?? 0) * 1.5;
      const adjusted = candidate.score - penalty;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIndex = i;
      }
    }

    const [chosen] = pool.splice(bestIndex, 1);
    picked.push(chosen);
    categoryCounts.set(
      chosen.categoryId,
      (categoryCounts.get(chosen.categoryId) ?? 0) + 1,
    );
  }

  return picked;
}

export function scoreFreeDeliveryCandidate(
  product: DiscoveryProductCandidate,
  input: {
    remainingScore: number;
    sameCategory: boolean;
    intelligence: IntelligenceScoringContext;
    signals: ProductRankingSignals;
  },
): RankedDiscoveryProduct | null {
  const categoryEntry = input.intelligence.categoryScores.get(
    product.categoryId,
  );
  const intelligenceAffinity = categoryEntry
    ? categoryEntry.score + categoryEntry.recentScore * 1.5
    : 0;

  const score = scoreFreeDeliveryBoost({
    contribution: Number(product.freeDeliveryValue ?? 0),
    remainingScore: input.remainingScore,
    sameCategory: input.sameCategory,
    categoryAffinity: 0,
    intelligenceAffinity,
  });

  if (score <= 0) return null;

  let reasonKey: RecommendationReasonKey = "free_delivery";
  if (categoryEntry?.label && intelligenceAffinity > 0) {
    reasonKey = "category_affinity";
  }

  return {
    productId: product.id,
    categoryId: product.categoryId,
    score,
    reasonKey,
    reason:
      reasonKey === "category_affinity" && categoryEntry?.label
        ? buildRecommendationReason("category_affinity", {
            categoryLabel: categoryEntry.label,
          })
        : RECOMMENDATION_REASONS.free_delivery,
  };
}

export function rankFreeDeliveryCandidates(
  candidates: DiscoveryProductCandidate[],
  input: {
    remainingScore: number;
    cartCategoryIds: Set<string>;
    intelligence: IntelligenceScoringContext;
    signalsByProduct: Map<string, ProductRankingSignals>;
    limit: number;
  },
): RankedDiscoveryProduct[] {
  const ranked = candidates
    .map((product) =>
      scoreFreeDeliveryCandidate(product, {
        remainingScore: input.remainingScore,
        sameCategory: input.cartCategoryIds.has(product.categoryId),
        intelligence: input.intelligence,
        signals: input.signalsByProduct.get(product.id) ?? {},
      }),
    )
    .filter((row): row is RankedDiscoveryProduct => !!row)
    .sort(
      (a, b) => b.score - a.score || a.productId.localeCompare(b.productId),
    );

  return selectDiverseProducts(ranked, input.limit);
}

export function buildPopularityReason(): string {
  return RECOMMENDATION_REASONS.popular;
}
