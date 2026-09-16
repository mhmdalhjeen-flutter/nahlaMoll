import type { CustomerAffinityProfile } from "../customer-intelligence/customer-intelligence.types";
import {
  buildIntelligenceScoringContext,
  type IntelligenceScoringContext,
  type ProductRankingSignals,
} from "./product-discovery.logic";
import {
  CATEGORY_ALIAS_TERMS,
  PRODUCT_SYNONYM_GROUPS,
  SEARCH_INTENT_PREFIXES,
  SEARCH_SCORE_WEIGHTS,
} from "./product-search.constants";

export type SearchIntentType = "category" | "tag" | "product" | "text";

export interface CatalogCategory {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  description?: string | null;
  parentId?: string | null;
}

export interface SearchProductCandidate {
  id: string;
  name: string;
  nameEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  categoryId: string;
  tags: string[];
  isRecommended: boolean;
  isAvailable: boolean;
  availability: string;
  stock: number;
  price: number | string;
  hasOffer: boolean;
  offerStartDate?: Date | null;
  offerEndDate?: Date | null;
  category?: { id: string; name: string; slug: string } | null;
}

export interface ParsedSearchQuery {
  raw: string;
  cleaned: string;
  normalized: string;
  tokens: string[];
  intent: SearchIntentType;
  matchedCategoryIds: string[];
  matchedCategoryLabels: string[];
  matchedTags: string[];
  expandedTerms: string[];
  synonymKeywords: string[];
  synonymGroupIds: string[];
}

export interface CategoryMatch {
  categoryId: string;
  label: string;
  score: number;
  matchedVia: "name" | "slug" | "description" | "alias";
}

export interface SearchSuggestion {
  type: "product" | "category" | "tag";
  label: string;
  value: string;
}

export interface RankedSearchProduct {
  productId: string;
  score: number;
  relevanceScore: number;
  boostScore: number;
  matchReason?: string;
}

export interface SearchRankContext {
  parsed: ParsedSearchQuery;
  intelligence?: IntelligenceScoringContext | null;
  signalsByProduct: Map<string, ProductRankingSignals>;
}

/** Safe Arabic normalization for search matching only — not for mutating product names. */
export function normalizeArabicForSearch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripSearchIntentPrefixes(query: string): string {
  let cleaned = query.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of SEARCH_INTENT_PREFIXES) {
      const next = cleaned.replace(pattern, "");
      if (next !== cleaned) {
        cleaned = next.trim();
        changed = true;
      }
    }
  }
  return cleaned.trim();
}

function tokenOverlap(query: string, target: string): number {
  const q = normalizeArabicForSearch(query);
  const t = normalizeArabicForSearch(target);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.includes(q) || q.includes(t)) return 80;
  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = new Set(t.split(" ").filter(Boolean));
  let hits = 0;
  for (const tok of qTokens) {
    if (tTokens.has(tok)) hits += 1;
  }
  return hits > 0 ? hits * 25 : 0;
}

function scoreCategoryAlias(query: string, category: CatalogCategory): number {
  const q = normalizeArabicForSearch(query);
  let best = 0;
  for (const [key, aliases] of Object.entries(CATEGORY_ALIAS_TERMS)) {
    const slugHit = category.slug.includes(key);
    const nameHit = normalizeArabicForSearch(category.name).includes(key);
    const nameEnHit = category.nameEn
      ? normalizeArabicForSearch(category.nameEn).includes(key)
      : false;
    if (!slugHit && !nameHit && !nameEnHit) continue;
    for (const alias of aliases) {
      const a = normalizeArabicForSearch(alias);
      if (q === a || q.includes(a) || a.includes(q)) {
        best = Math.max(best, 90);
      }
    }
  }
  return best;
}

export function scoreCategoryMatch(
  query: string,
  category: CatalogCategory,
): CategoryMatch | null {
  const scores: CategoryMatch[] = [];

  const nameScore = tokenOverlap(query, category.name);
  if (nameScore >= 50) {
    scores.push({
      categoryId: category.id,
      label: category.name,
      score: nameScore,
      matchedVia: "name",
    });
  }

  if (category.nameEn) {
    const nameEnScore = tokenOverlap(query, category.nameEn);
    if (nameEnScore >= 50) {
      scores.push({
        categoryId: category.id,
        label: category.name,
        score: nameEnScore - 5,
        matchedVia: "name",
      });
    }
  }

  const slugScore = tokenOverlap(query, category.slug.replace(/-/g, " "));
  if (slugScore >= 50) {
    scores.push({
      categoryId: category.id,
      label: category.name,
      score: slugScore - 5,
      matchedVia: "slug",
    });
  }

  if (category.description) {
    const descScore = tokenOverlap(query, category.description);
    if (descScore >= 50) {
      scores.push({
        categoryId: category.id,
        label: category.name,
        score: descScore - 10,
        matchedVia: "description",
      });
    }
  }

  const aliasScore = scoreCategoryAlias(query, category);
  if (aliasScore >= 80) {
    scores.push({
      categoryId: category.id,
      label: category.name,
      score: aliasScore,
      matchedVia: "alias",
    });
  }

  if (scores.length === 0) return null;
  return scores.sort((a, b) => b.score - a.score)[0]!;
}

export function resolveCategoriesFromQuery(
  query: string,
  categories: CatalogCategory[],
): CategoryMatch[] {
  const matches: CategoryMatch[] = [];
  for (const category of categories) {
    const match = scoreCategoryMatch(query, category);
    if (match && match.score >= 50) matches.push(match);
  }
  return matches.sort((a, b) => b.score - a.score);
}

export function resolveSynonymGroups(query: string): Array<{
  id: string;
  tags: string[];
  keywords: string[];
}> {
  const normalized = normalizeArabicForSearch(query);
  const matched: Array<{ id: string; tags: string[]; keywords: string[] }> = [];

  for (const group of PRODUCT_SYNONYM_GROUPS) {
    const hit = group.terms.some((term) => {
      const t = normalizeArabicForSearch(term);
      return (
        normalized === t ||
        normalized.includes(t) ||
        t.includes(normalized) ||
        normalized.split(" ").some((tok) => t.includes(tok) && tok.length >= 3)
      );
    });
    if (hit)
      matched.push({
        id: group.id,
        tags: group.tags,
        keywords: group.keywords,
      });
  }

  return matched;
}

export function detectSearchIntent(input: {
  query: string;
  categoryMatches: CategoryMatch[];
  synonymGroups: Array<{ id: string; tags: string[]; keywords: string[] }>;
}): SearchIntentType {
  const words = normalizeArabicForSearch(input.query)
    .split(" ")
    .filter(Boolean);

  if (
    input.categoryMatches.length > 0 &&
    input.categoryMatches[0]!.score >= 80
  ) {
    return "category";
  }

  if (input.synonymGroups.length > 0) {
    const group = input.synonymGroups[0]!;
    if (group.tags.length > 0 && words.length <= 4) return "tag";
  }

  if (input.categoryMatches.length > 0 && words.length <= 3) {
    return "category";
  }

  if (words.length === 1 && words[0]!.length >= 3) {
    return "product";
  }

  return "text";
}

export function buildExpandedSearchTerms(input: {
  cleaned: string;
  normalized: string;
  synonymKeywords: string[];
  matchedTags: string[];
}): string[] {
  const terms = new Set<string>();
  const add = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length < 2) return;
    terms.add(trimmed);
    const normalized = normalizeArabicForSearch(trimmed);
    if (normalized.length >= 2) terms.add(normalized);
  };

  add(input.cleaned);
  add(input.normalized);
  for (const token of input.normalized.split(" ").filter(Boolean)) {
    if (token.length >= 2) terms.add(token);
  }
  for (const keyword of input.synonymKeywords) add(keyword);
  for (const tag of input.matchedTags) add(tag);

  return [...terms];
}

export function parseSearchQuery(
  rawQuery: string,
  categories: CatalogCategory[],
): ParsedSearchQuery {
  const raw = rawQuery.trim();
  const cleaned = stripSearchIntentPrefixes(raw);
  const normalized = normalizeArabicForSearch(cleaned);
  const tokens = normalized.split(" ").filter(Boolean);

  const categoryMatches = resolveCategoriesFromQuery(cleaned, categories);
  const synonymGroups = resolveSynonymGroups(cleaned);

  const matchedTags = [
    ...new Set(
      synonymGroups.flatMap((g) => g.tags.map((t) => t.toLowerCase())),
    ),
  ];
  const synonymKeywords = [
    ...new Set(synonymGroups.flatMap((g) => g.keywords)),
  ];
  const synonymGroupIds = synonymGroups.map((g) => g.id);

  const intent = detectSearchIntent({
    query: cleaned,
    categoryMatches,
    synonymGroups,
  });

  const matchedCategoryIds = categoryMatches.map((m) => m.categoryId);
  const matchedCategoryLabels = categoryMatches.map((m) => m.label);

  const expandedTerms = buildExpandedSearchTerms({
    cleaned,
    normalized,
    synonymKeywords,
    matchedTags,
  });

  return {
    raw,
    cleaned,
    normalized,
    tokens,
    intent,
    matchedCategoryIds,
    matchedCategoryLabels,
    matchedTags,
    expandedTerms,
    synonymKeywords,
    synonymGroupIds,
  };
}

export function buildFallbackParsedQuery(
  parsed: ParsedSearchQuery,
  categories: CatalogCategory[],
): ParsedSearchQuery | null {
  if (parsed.expandedTerms.length <= 1) return null;

  const shorterTokens = parsed.tokens.slice(
    0,
    Math.max(1, parsed.tokens.length - 1),
  );
  if (shorterTokens.join(" ") === parsed.normalized) return null;

  const fallbackCleaned = shorterTokens.join(" ");
  return parseSearchQuery(fallbackCleaned, categories);
}

function isOfferActive(product: SearchProductCandidate): boolean {
  if (!product.hasOffer) return false;
  const now = new Date();
  if (product.offerStartDate && product.offerStartDate > now) return false;
  if (product.offerEndDate && product.offerEndDate < now) return false;
  return true;
}

function isProductInStock(product: SearchProductCandidate): boolean {
  if (!product.isAvailable || product.availability === "UNAVAILABLE")
    return false;
  if (product.availability === "UNLIMITED") return true;
  return product.stock > 0;
}

function scoreTextRelevance(
  product: SearchProductCandidate,
  parsed: ParsedSearchQuery,
): number {
  let score = 0;
  const name = normalizeArabicForSearch(product.name);
  const nameEn = normalizeArabicForSearch(product.nameEn ?? "");
  const description = normalizeArabicForSearch(product.description);
  const descriptionEn = normalizeArabicForSearch(product.descriptionEn ?? "");
  const tags = (product.tags ?? []).map((t) => normalizeArabicForSearch(t));
  const q = parsed.normalized;

  if (q.length >= 2) {
    if (name === q) score += SEARCH_SCORE_WEIGHTS.exactName;
    else if (name.startsWith(q)) score += SEARCH_SCORE_WEIGHTS.nameStartsWith;
    else if (name.includes(q)) score += SEARCH_SCORE_WEIGHTS.nameContains;

    if (nameEn === q) score += SEARCH_SCORE_WEIGHTS.nameEnExact;
    else if (nameEn.includes(q)) score += SEARCH_SCORE_WEIGHTS.nameEnContains;

    if (description.includes(q)) score += SEARCH_SCORE_WEIGHTS.descriptionMatch;
    if (descriptionEn.includes(q))
      score += SEARCH_SCORE_WEIGHTS.descriptionMatch;
  }

  for (const token of parsed.tokens) {
    if (token.length < 2) continue;
    if (name.includes(token)) score += 12;
    if (nameEn.includes(token)) score += 8;
    if (description.includes(token)) score += 5;
  }

  for (const tag of tags) {
    if (parsed.matchedTags.some((t) => tag === normalizeArabicForSearch(t))) {
      score += SEARCH_SCORE_WEIGHTS.tagExact;
    } else if (
      parsed.expandedTerms.some((term) => {
        const n = normalizeArabicForSearch(term);
        return tag.includes(n) || n.includes(tag);
      })
    ) {
      score += SEARCH_SCORE_WEIGHTS.tagPartial;
    }
  }

  for (const keyword of parsed.synonymKeywords) {
    const k = normalizeArabicForSearch(keyword);
    if (
      name.includes(k) ||
      nameEn.includes(k) ||
      description.includes(k) ||
      tags.some((tag) => tag.includes(k))
    ) {
      score += SEARCH_SCORE_WEIGHTS.synonymKeyword;
    }
  }

  if (
    parsed.matchedCategoryIds.includes(product.categoryId) &&
    parsed.intent === "category"
  ) {
    score += SEARCH_SCORE_WEIGHTS.categoryIntent;
  }

  if (product.category) {
    const catName = normalizeArabicForSearch(product.category.name);
    if (parsed.tokens.some((t) => catName.includes(t) || t.includes(catName))) {
      score += SEARCH_SCORE_WEIGHTS.categoryNameMatch;
    }
  }

  return score;
}

function scoreIntelligenceBoost(
  product: SearchProductCandidate,
  parsed: ParsedSearchQuery,
  intelligence?: IntelligenceScoringContext | null,
): number {
  if (!intelligence) return 0;

  let boost = 0;

  const categoryEntry = intelligence.categoryScores.get(product.categoryId);
  if (categoryEntry) {
    const catBoost =
      (categoryEntry.score + categoryEntry.recentScore * 1.8) *
      (SEARCH_SCORE_WEIGHTS.intelligenceCategoryMax / 10);
    boost += Math.min(catBoost, SEARCH_SCORE_WEIGHTS.intelligenceCategoryMax);
  }

  for (const tag of product.tags ?? []) {
    const entry = intelligence.tagScores.get(tag.toLowerCase());
    if (!entry) continue;
    const tagBoost =
      (entry.score + entry.recentScore * 1.8) *
      (SEARCH_SCORE_WEIGHTS.intelligenceTagMax / 8);
    boost += Math.min(tagBoost, SEARCH_SCORE_WEIGHTS.intelligenceTagMax / 2);
  }

  for (const search of intelligence.searchTerms) {
    const term = normalizeArabicForSearch(search.term);
    if (term.length < 2) continue;
    const name = normalizeArabicForSearch(product.name);
    const matchesQuery =
      parsed.normalized.includes(term) ||
      term.includes(parsed.normalized) ||
      name.includes(term);
    if (!matchesQuery) continue;
    const searchBoost =
      (search.score + search.recentScore * 1.8) *
      (SEARCH_SCORE_WEIGHTS.intelligenceSearchMax / 6);
    boost += Math.min(searchBoost, SEARCH_SCORE_WEIGHTS.intelligenceSearchMax);
  }

  return Math.min(
    boost,
    SEARCH_SCORE_WEIGHTS.intelligenceCategoryMax +
      SEARCH_SCORE_WEIGHTS.intelligenceTagMax +
      SEARCH_SCORE_WEIGHTS.intelligenceSearchMax,
  );
}

function scorePopularityBoost(signals: ProductRankingSignals): number {
  let boost = 0;
  const orderQty = signals.orderQuantity ?? 0;
  if (orderQty > 0) {
    boost += Math.min(
      Math.log10(orderQty + 1) * 2,
      SEARCH_SCORE_WEIGHTS.popularityMax,
    );
  }
  const favCount = signals.favoriteCount ?? 0;
  if (favCount > 0) {
    boost += Math.min(favCount * 0.4, SEARCH_SCORE_WEIGHTS.popularityMax / 2);
  }
  return Math.min(boost, SEARCH_SCORE_WEIGHTS.popularityMax);
}

function scoreRatingBoost(signals: ProductRankingSignals): number {
  const reviewCount = signals.reviewCount ?? 0;
  const averageRating = signals.averageRating ?? 0;
  if (reviewCount < 2 || averageRating < 3.5) return 0;
  return Math.min(averageRating * 1.2, SEARCH_SCORE_WEIGHTS.ratingMax);
}

export function scoreSearchCandidate(
  product: SearchProductCandidate,
  context: SearchRankContext,
): RankedSearchProduct {
  const relevanceScore = scoreTextRelevance(product, context.parsed);
  let boostScore = 0;

  boostScore += scoreIntelligenceBoost(
    product,
    context.parsed,
    context.intelligence,
  );
  boostScore += scorePopularityBoost(
    context.signalsByProduct.get(product.id) ?? {},
  );
  boostScore += scoreRatingBoost(
    context.signalsByProduct.get(product.id) ?? {},
  );

  if (product.isRecommended)
    boostScore += SEARCH_SCORE_WEIGHTS.adminRecommended;
  if (isOfferActive(product)) boostScore += SEARCH_SCORE_WEIGHTS.activeOffer;
  if (isProductInStock(product)) {
    boostScore += SEARCH_SCORE_WEIGHTS.inStockBoost;
  } else {
    boostScore += SEARCH_SCORE_WEIGHTS.unavailablePenalty;
  }

  const cappedBoost = Math.min(boostScore, relevanceScore * 0.35 + 20);
  const score = relevanceScore + cappedBoost;

  return {
    productId: product.id,
    score,
    relevanceScore,
    boostScore: cappedBoost,
  };
}

export function rankSearchCandidates(
  candidates: SearchProductCandidate[],
  context: SearchRankContext,
  options?: { minRelevanceScore?: number; fallbackMode?: boolean },
): RankedSearchProduct[] {
  const minScore =
    options?.minRelevanceScore ??
    (options?.fallbackMode
      ? SEARCH_SCORE_WEIGHTS.fallbackMinScore
      : SEARCH_SCORE_WEIGHTS.minRelevanceScore);

  return candidates
    .map((product) => scoreSearchCandidate(product, context))
    .filter((row) => row.relevanceScore >= minScore || options?.fallbackMode)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.relevanceScore - a.relevanceScore ||
        a.productId.localeCompare(b.productId),
    );
}

export function buildSearchSuggestions(input: {
  parsed: ParsedSearchQuery;
  ranked: RankedSearchProduct[];
  products: SearchProductCandidate[];
  categories: CatalogCategory[];
}): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];
  const seen = new Set<string>();

  const add = (suggestion: SearchSuggestion) => {
    const key = `${suggestion.type}:${suggestion.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  };

  for (const categoryId of input.parsed.matchedCategoryIds.slice(0, 2)) {
    const category = input.categories.find((c) => c.id === categoryId);
    if (!category) continue;
    add({
      type: "category",
      label: category.name,
      value: category.slug,
    });
  }

  for (const tag of input.parsed.matchedTags.slice(0, 3)) {
    add({ type: "tag", label: tag, value: tag });
  }

  const productById = new Map(input.products.map((p) => [p.id, p]));
  for (const row of input.ranked.slice(0, 5)) {
    const product = productById.get(row.productId);
    if (!product) continue;
    add({ type: "product", label: product.name, value: product.id });
  }

  if (
    input.parsed.normalized !== normalizeArabicForSearch(input.parsed.raw) &&
    input.parsed.raw.length >= 2
  ) {
    add({
      type: "tag",
      label: input.parsed.cleaned,
      value: input.parsed.cleaned,
    });
  }

  return suggestions.slice(0, 8);
}

export function buildIntelligenceContext(
  profile: CustomerAffinityProfile | null | undefined,
): IntelligenceScoringContext | null {
  if (!profile?.hasBehavioralData) return null;
  return buildIntelligenceScoringContext(profile);
}

export function paginateRanked<T>(
  items: T[],
  page: number,
  limit: number,
): {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const total = items.length;
  const start = (safePage - 1) * safeLimit;
  const paginated = items.slice(start, start + safeLimit);
  return {
    items: paginated,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export function applySecondarySort<T extends { productId: string }>(
  ranked: T[],
  products: SearchProductCandidate[],
  sortBy: "relevance" | "price" | "createdAt",
  sortOrder: "asc" | "desc",
): T[] {
  if (sortBy === "relevance") return ranked;

  const productMap = new Map(products.map((p) => [p.id, p]));
  const factor = sortOrder === "asc" ? 1 : -1;

  return [...ranked].sort((a, b) => {
    const pa = productMap.get(a.productId);
    const pb = productMap.get(b.productId);
    if (!pa || !pb) return 0;

    if (sortBy === "price") {
      const priceA = Number(pa.price);
      const priceB = Number(pb.price);
      return (
        (priceA - priceB) * factor || a.productId.localeCompare(b.productId)
      );
    }

    return a.productId.localeCompare(b.productId) * factor;
  });
}
