import { CustomerInteractionType } from "@prisma/client";
import {
  EVENT_BASE_WEIGHTS,
  INTELLIGENCE_DEDUPE_WINDOW_MS,
  INTELLIGENCE_HALF_LIFE_DAYS,
  INTELLIGENCE_MIN_SIGNAL_COUNT,
  INTELLIGENCE_RECENT_DAYS,
  SUPPLEMENTAL_WEIGHTS,
} from "./customer-intelligence.constants";
import type {
  AffinityEntry,
  AffinityStrength,
  CustomerAffinityProfile,
  IntelligenceSignalInput,
  ResolvedSignal,
} from "./customer-intelligence.types";

const PRODUCT_ENGAGEMENT_TYPES = new Set<CustomerInteractionType>([
  CustomerInteractionType.CHAT_PRODUCT_CLICK,
  CustomerInteractionType.PRODUCT_CLICKED,
  CustomerInteractionType.SEARCH_RESULT_CLICK,
  CustomerInteractionType.RECOMMENDATION_CLICKED,
  CustomerInteractionType.RECOMMENDATION_ADDED_TO_CART,
  CustomerInteractionType.CHAT_BASKET_PRODUCT_SELECTION,
]);

const PRODUCT_VIEW_TYPES = new Set<CustomerInteractionType>([
  CustomerInteractionType.PRODUCT_VIEWED,
  CustomerInteractionType.RECOMMENDATION_SHOWN,
]);

const SEARCH_TYPES = new Set<CustomerInteractionType>([
  CustomerInteractionType.CHAT_SEARCH,
  CustomerInteractionType.SEARCH_QUERY,
]);

const CATEGORY_TYPES = new Set<CustomerInteractionType>([
  CustomerInteractionType.CHAT_CATEGORY_CLICK,
  CustomerInteractionType.CHAT_CATEGORY_INTERACTION,
  CustomerInteractionType.CATEGORY_VIEWED,
  CustomerInteractionType.CATEGORY_CLICKED,
]);

const PURCHASE_TYPES = new Set<CustomerInteractionType>([
  CustomerInteractionType.ORDER_CREATED,
  CustomerInteractionType.ORDER_COMPLETED,
  CustomerInteractionType.RECOMMENDATION_PURCHASED,
]);

const MS_PER_DAY = 86_400_000;

export function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

export function recencyDecay(ageDays: number, halfLifeDays: number): number {
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

export function isRecentSignal(ageDays: number, recentDays: number): boolean {
  return ageDays <= recentDays;
}

export function toStrength(score: number): AffinityStrength {
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}

function dedupeBucket(timestamp: Date): number {
  return Math.floor(timestamp.getTime() / INTELLIGENCE_DEDUPE_WINDOW_MS);
}

function baseWeightFor(input: IntelligenceSignalInput): number {
  if (input.type === "SUPPLEMENTAL_FAVORITE")
    return SUPPLEMENTAL_WEIGHTS.favorite;
  if (input.type === "SUPPLEMENTAL_CART") return SUPPLEMENTAL_WEIGHTS.cart;
  if (input.type === "SUPPLEMENTAL_ORDER") return SUPPLEMENTAL_WEIGHTS.order;
  return EVENT_BASE_WEIGHTS[input.type] ?? 0;
}

function reasonLabelFor(input: IntelligenceSignalInput): string {
  if (input.type === "SUPPLEMENTAL_FAVORITE")
    return "Favorited (account history)";
  if (input.type === "SUPPLEMENTAL_CART") return "In cart (account history)";
  if (input.type === "SUPPLEMENTAL_ORDER") return "Purchased (order history)";
  if (PURCHASE_TYPES.has(input.type as CustomerInteractionType))
    return "Purchased";
  if (input.type === CustomerInteractionType.FAVORITE_ADDED)
    return "Added to favorites";
  if (input.type === CustomerInteractionType.CART_ITEM_ADDED)
    return "Added to cart";
  if (PRODUCT_ENGAGEMENT_TYPES.has(input.type as CustomerInteractionType)) {
    return "Engaged with product";
  }
  if (PRODUCT_VIEW_TYPES.has(input.type as CustomerInteractionType)) {
    return "Viewed product";
  }
  if (SEARCH_TYPES.has(input.type as CustomerInteractionType))
    return "Searched";
  if (CATEGORY_TYPES.has(input.type as CustomerInteractionType)) {
    return "Browsed category";
  }
  if (input.type === CustomerInteractionType.CHECKOUT_STARTED)
    return "Started checkout";
  return String(input.type).replace(/_/g, " ").toLowerCase();
}

/** Build a dedupe key so chatbot + store variants collapse to one canonical signal. */
export function buildDedupeKey(input: IntelligenceSignalInput): string | null {
  const bucket = dedupeBucket(input.createdAt);
  const type = input.type;

  if (
    typeof type === "string" &&
    (type === "SUPPLEMENTAL_FAVORITE" ||
      type === "SUPPLEMENTAL_CART" ||
      type === "SUPPLEMENTAL_ORDER")
  ) {
    if (!input.productId) return null;
    return `${type}:${input.productId}:${bucket}`;
  }

  const eventType = type as CustomerInteractionType;

  if (PRODUCT_ENGAGEMENT_TYPES.has(eventType) && input.productId) {
    return `product:engage:${input.productId}:${bucket}`;
  }
  if (PRODUCT_VIEW_TYPES.has(eventType) && input.productId) {
    return `product:view:${input.productId}:${bucket}`;
  }
  if (
    (eventType === CustomerInteractionType.FAVORITE_ADDED ||
      eventType === CustomerInteractionType.FAVORITE_REMOVED) &&
    input.productId
  ) {
    return `product:favorite:${input.productId}:${bucket}`;
  }
  if (
    (eventType === CustomerInteractionType.CART_ITEM_ADDED ||
      eventType === CustomerInteractionType.CART_ITEM_REMOVED ||
      eventType === CustomerInteractionType.CART_QUANTITY_CHANGED) &&
    input.productId
  ) {
    return `product:cart:${input.productId}:${bucket}`;
  }
  if (PURCHASE_TYPES.has(eventType) && input.productId) {
    return `product:purchase:${input.productId}:${bucket}`;
  }
  if (SEARCH_TYPES.has(eventType) && input.searchTerm) {
    return `search:${normalizeSearchTerm(input.searchTerm)}:${bucket}`;
  }
  if (CATEGORY_TYPES.has(eventType) && input.categoryId) {
    return `category:${input.categoryId}:${bucket}`;
  }
  if (eventType === CustomerInteractionType.CHECKOUT_STARTED) {
    return `checkout:${bucket}`;
  }
  if (eventType === CustomerInteractionType.CHAT_BASKET_ACCEPTED) {
    return `basket:accepted:${bucket}`;
  }

  return `event:${eventType}:${input.productId ?? input.categoryId ?? input.searchTerm ?? "generic"}:${bucket}`;
}

export function resolveSignals(
  inputs: IntelligenceSignalInput[],
): ResolvedSignal[] {
  const grouped = new Map<string, ResolvedSignal>();

  for (const input of inputs) {
    const weight = baseWeightFor(input);
    if (weight === 0) continue;

    const dedupeKey = buildDedupeKey(input);
    if (!dedupeKey) continue;

    const candidate: ResolvedSignal = {
      dedupeKey,
      type: input.type,
      createdAt: input.createdAt,
      baseWeight: weight,
      productId: input.productId ?? undefined,
      categoryId: input.categoryId ?? undefined,
      searchTerm: input.searchTerm ?? undefined,
      tags: input.tags ?? [],
      source: input.source ?? undefined,
      reasonLabel: reasonLabelFor(input),
    };

    const existing = grouped.get(dedupeKey);
    if (!existing || candidate.baseWeight > existing.baseWeight) {
      grouped.set(dedupeKey, candidate);
    }
  }

  const byProductBucket = new Map<string, ResolvedSignal[]>();
  for (const signal of grouped.values()) {
    if (!signal.productId) continue;
    const bucket = dedupeBucket(signal.createdAt);
    const key = `${signal.productId}:${bucket}`;
    const list = byProductBucket.get(key) ?? [];
    list.push(signal);
    byProductBucket.set(key, list);
  }

  for (const list of byProductBucket.values()) {
    const hasEngagement = list.some(
      (s) =>
        PRODUCT_ENGAGEMENT_TYPES.has(s.type as CustomerInteractionType) ||
        s.type === "SUPPLEMENTAL_FAVORITE" ||
        s.type === "SUPPLEMENTAL_CART" ||
        s.type === "SUPPLEMENTAL_ORDER" ||
        PURCHASE_TYPES.has(s.type as CustomerInteractionType) ||
        s.type === CustomerInteractionType.FAVORITE_ADDED ||
        s.type === CustomerInteractionType.CART_ITEM_ADDED,
    );
    if (!hasEngagement) continue;
    for (const signal of list) {
      if (PRODUCT_VIEW_TYPES.has(signal.type as CustomerInteractionType)) {
        grouped.delete(signal.dedupeKey);
      }
    }
  }

  return [...grouped.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

function accumulateEntry(
  map: Map<string, AffinityEntry>,
  id: string,
  label: string | undefined,
  decayedWeight: number,
  recentWeight: number,
  reason: string,
): void {
  const existing = map.get(id) ?? {
    id,
    label,
    score: 0,
    recentScore: 0,
    strength: "low" as AffinityStrength,
    reasons: [],
  };

  existing.score += decayedWeight;
  existing.recentScore += recentWeight;
  if (label && !existing.label) existing.label = label;
  if (existing.reasons.length < 5) {
    existing.reasons.push(reason);
  }

  existing.strength = toStrength(existing.score);
  map.set(id, existing);
}

export function buildAffinityProfileFromSignals(
  signals: ResolvedSignal[],
  options: {
    userId?: string;
    sessionId?: string;
    now?: Date;
    categoryLabels?: Map<string, string>;
    productLabels?: Map<string, string>;
  },
): CustomerAffinityProfile {
  const now = options.now ?? new Date();
  const categories = new Map<string, AffinityEntry>();
  const tags = new Map<string, AffinityEntry>();
  const products = new Map<string, AffinityEntry>();
  const searches = new Map<string, AffinityEntry>();

  let recentSignalCount = 0;
  let oldest: Date | undefined;
  let newest: Date | undefined;

  for (const signal of signals) {
    const ageDays = (now.getTime() - signal.createdAt.getTime()) / MS_PER_DAY;
    const decay = recencyDecay(ageDays, INTELLIGENCE_HALF_LIFE_DAYS);
    const decayedWeight = signal.baseWeight * decay;
    const recentWeight = isRecentSignal(ageDays, INTELLIGENCE_RECENT_DAYS)
      ? decayedWeight
      : 0;

    if (recentWeight > 0) recentSignalCount += 1;
    if (!oldest || signal.createdAt < oldest) oldest = signal.createdAt;
    if (!newest || signal.createdAt > newest) newest = signal.createdAt;

    const ageLabel =
      ageDays < 1
        ? "today"
        : ageDays < 2
          ? "yesterday"
          : `${Math.round(ageDays)} days ago`;
    const reason = `${signal.reasonLabel} · ${ageLabel} · weight ${signal.baseWeight.toFixed(1)} × decay ${decay.toFixed(2)}${signal.source ? ` · via ${signal.source}` : ""}`;

    if (signal.productId) {
      accumulateEntry(
        products,
        signal.productId,
        options.productLabels?.get(signal.productId),
        decayedWeight,
        recentWeight,
        reason,
      );
    }

    if (signal.categoryId) {
      accumulateEntry(
        categories,
        signal.categoryId,
        options.categoryLabels?.get(signal.categoryId),
        decayedWeight,
        recentWeight,
        reason,
      );
    }

    for (const tag of signal.tags) {
      const normalized = tag.toLowerCase();
      accumulateEntry(
        tags,
        normalized,
        normalized,
        decayedWeight,
        recentWeight,
        reason,
      );
    }

    if (signal.searchTerm) {
      const term = normalizeSearchTerm(signal.searchTerm);
      accumulateEntry(
        searches,
        term,
        term,
        decayedWeight,
        recentWeight,
        reason,
      );
    }
  }

  const sortEntries = (entries: AffinityEntry[]) =>
    entries
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score || b.recentScore - a.recentScore);

  const signalCount = signals.length;

  return {
    userId: options.userId,
    sessionId: options.sessionId,
    computedAt: now.toISOString(),
    hasBehavioralData: signalCount >= INTELLIGENCE_MIN_SIGNAL_COUNT,
    signalCount,
    categories: sortEntries([...categories.values()]),
    tags: sortEntries([...tags.values()]),
    products: sortEntries([...products.values()]),
    searches: sortEntries([...searches.values()]),
    meta: {
      recentSignalCount,
      oldestSignalAt: oldest?.toISOString(),
      newestSignalAt: newest?.toISOString(),
    },
  };
}

export function expandOrderProductSignals(
  metadata: Record<string, unknown> | null | undefined,
  createdAt: Date,
): IntelligenceSignalInput[] {
  const productIds = metadata?.productIds;
  if (!Array.isArray(productIds)) return [];

  return productIds
    .filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    )
    .map((productId) => ({
      type: CustomerInteractionType.ORDER_CREATED,
      createdAt,
      productId,
      metadata,
      source: "server",
    }));
}
