import {
  MIN_SECTION_PRODUCTS,
  buildIntelligenceScoringContext,
  buildRecommendationReason,
  overlapRatio,
  pickUniqueIds,
  rankFreeDeliveryCandidates,
  rankPersonalizedCandidates,
  scoreCategoryAffinity,
  scoreFreeDeliveryBoost,
  scorePersonalizedCandidate,
  scoreTagOverlap,
  selectDiverseProducts,
  shouldIncludeSection,
  type DiscoveryProductCandidate,
} from "./product-discovery.logic";
import type { CustomerAffinityProfile } from "../customer-intelligence/customer-intelligence.types";

const baseProfile = (): CustomerAffinityProfile => ({
  computedAt: new Date().toISOString(),
  hasBehavioralData: true,
  signalCount: 3,
  categories: [],
  tags: [],
  products: [],
  searches: [],
  meta: { recentSignalCount: 1 },
});

describe("product-discovery.logic", () => {
  it("pickUniqueIds respects exclusion set", () => {
    const exclude = new Set(["a"]);
    expect(pickUniqueIds(["a", "b", "c"], exclude, 2)).toEqual(["b", "c"]);
  });

  it("detects high overlap between sections", () => {
    const shown = new Set(["a", "b", "c", "d"]);
    expect(overlapRatio(shown, ["a", "b", "c", "e"])).toBe(0.75);
  });

  it("rejects duplicate section when alternatives exist", () => {
    const shown = new Set(["a", "b", "c", "d"]);
    expect(shouldIncludeSection(["a", "b", "c", "d"], shown, 20)).toBe(false);
  });

  it("requires minimum products", () => {
    expect(shouldIncludeSection(["a"], new Set(), 10)).toBe(false);
    expect(MIN_SECTION_PRODUCTS).toBeGreaterThan(1);
  });

  it("scores tag overlap with intelligence-weighted tags", () => {
    const weighted = scoreTagOverlap(
      ["phone", "case"],
      new Map([
        ["phone", { score: 2, recentScore: 1 }],
        ["charger", { score: 1, recentScore: 0 }],
      ]),
    );
    expect(weighted).toBeGreaterThan(0);
  });

  it("prefers same-category free-delivery boost candidates", () => {
    const same = scoreFreeDeliveryBoost({
      contribution: 40,
      remainingScore: 30,
      sameCategory: true,
      categoryAffinity: 2,
    });
    const other = scoreFreeDeliveryBoost({
      contribution: 40,
      remainingScore: 30,
      sameCategory: false,
      categoryAffinity: 2,
    });
    expect(same).toBeGreaterThan(other);
  });

  it("ranks personalized candidates by category affinity and search", () => {
    const profile: CustomerAffinityProfile = {
      ...baseProfile(),
      categories: [
        {
          id: "phones",
          label: "Phones",
          score: 4,
          recentScore: 2,
          strength: "high",
          reasons: [],
        },
      ],
      searches: [
        {
          id: "charger",
          score: 2,
          recentScore: 2,
          strength: "medium",
          reasons: [],
        },
      ],
    };

    const intelligence = buildIntelligenceScoringContext(profile);
    const candidates: DiscoveryProductCandidate[] = [
      {
        id: "p1",
        categoryId: "phones",
        name: "Fast Charger",
        tags: ["charger"],
        isRecommended: false,
        freeDeliveryValue: 0,
      },
      {
        id: "p2",
        categoryId: "other",
        name: "Random",
        tags: [],
        isRecommended: false,
        freeDeliveryValue: 0,
      },
    ];

    const ranked = rankPersonalizedCandidates(
      candidates,
      intelligence,
      new Map([
        ["p1", { orderQuantity: 10 }],
        ["p2", { orderQuantity: 1 }],
      ]),
      new Set(),
      2,
    );

    expect(ranked[0].productId).toBe("p1");
    expect(ranked[0].reason).toContain("Phones");
  });

  it("excludes purchased products from personalized ranking", () => {
    const profile: CustomerAffinityProfile = {
      ...baseProfile(),
      products: [
        {
          id: "bought",
          score: 5,
          recentScore: 0,
          strength: "high",
          reasons: ["Purchased · 10 days ago"],
        },
      ],
      categories: [
        {
          id: "c1",
          score: 3,
          recentScore: 0,
          strength: "medium",
          reasons: [],
        },
      ],
    };

    const intelligence = buildIntelligenceScoringContext(profile);
    const ranked = rankPersonalizedCandidates(
      [
        {
          id: "bought",
          categoryId: "c1",
          name: "Bought",
          tags: [],
          isRecommended: false,
          freeDeliveryValue: 0,
        },
        {
          id: "fresh",
          categoryId: "c1",
          name: "Fresh",
          tags: [],
          isRecommended: false,
          freeDeliveryValue: 0,
        },
      ],
      intelligence,
      new Map(),
      new Set(),
      2,
    );

    expect(ranked.map((r) => r.productId)).toEqual(["fresh"]);
  });

  it("selects diverse products across categories", () => {
    const picked = selectDiverseProducts(
      [
        {
          productId: "a1",
          categoryId: "cat-a",
          score: 10,
          reasonKey: "popular",
          reason: "شائع بين العملاء",
        },
        {
          productId: "a2",
          categoryId: "cat-a",
          score: 9,
          reasonKey: "popular",
          reason: "شائع بين العملاء",
        },
        {
          productId: "b1",
          categoryId: "cat-b",
          score: 8,
          reasonKey: "popular",
          reason: "شائع بين العملاء",
        },
      ],
      2,
    );

    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((p) => p.categoryId)).size).toBe(2);
  });

  it("ranks free-delivery candidates using intelligence affinity", () => {
    const profile: CustomerAffinityProfile = {
      ...baseProfile(),
      categories: [
        {
          id: "phones",
          label: "Phones",
          score: 3,
          recentScore: 1,
          strength: "high",
          reasons: [],
        },
      ],
    };
    const intelligence = buildIntelligenceScoringContext(profile);

    const ranked = rankFreeDeliveryCandidates(
      [
        {
          id: "boost-1",
          categoryId: "phones",
          name: "Boost",
          tags: [],
          isRecommended: false,
          freeDeliveryValue: 30,
        },
        {
          id: "boost-2",
          categoryId: "other",
          name: "Other",
          tags: [],
          isRecommended: false,
          freeDeliveryValue: 30,
        },
      ],
      {
        remainingScore: 20,
        cartCategoryIds: new Set(["phones"]),
        intelligence,
        signalsByProduct: new Map(),
        limit: 2,
      },
    );

    expect(ranked[0].productId).toBe("boost-1");
    expect(ranked[0].reason).toContain("Phones");
  });

  it("builds deterministic recommendation reasons", () => {
    expect(buildRecommendationReason("popular")).toBe("شائع بين العملاء");
    expect(
      buildRecommendationReason("category_affinity", { categoryLabel: "Tea" }),
    ).toBe("لأنك تهتم بـTea");
  });

  it("prefers recent category signals in personalized scoring", () => {
    const profile: CustomerAffinityProfile = {
      ...baseProfile(),
      categories: [
        {
          id: "recent-cat",
          label: "Recent",
          score: 1,
          recentScore: 4,
          strength: "high",
          reasons: [],
        },
      ],
    };
    const intelligence = buildIntelligenceScoringContext(profile);
    const recentScore = scorePersonalizedCandidate(
      {
        id: "p1",
        categoryId: "recent-cat",
        name: "Item",
        tags: [],
        isRecommended: false,
        freeDeliveryValue: 0,
      },
      intelligence,
      {},
      new Set(),
    ).score;

    const oldScore = scorePersonalizedCandidate(
      {
        id: "p2",
        categoryId: "old-cat",
        name: "Item",
        tags: [],
        isRecommended: false,
        freeDeliveryValue: 0,
      },
      {
        ...intelligence,
        categoryScores: new Map([
          ["old-cat", { score: 4, recentScore: 0, label: "Old" }],
        ]),
      },
      {},
      new Set(),
    ).score;

    expect(recentScore).toBeGreaterThan(oldScore);
  });

  it("adds sibling category affinity", () => {
    const scores = new Map([["cat-1", 3]]);
    const siblingBoost = scoreCategoryAffinity(
      scores,
      "cat-2",
      new Set(["cat-2"]),
    );
    expect(siblingBoost).toBeGreaterThan(0);
  });
});
