import {
  buildExpandedSearchTerms,
  buildIntelligenceContext,
  buildSearchSuggestions,
  normalizeArabicForSearch,
  paginateRanked,
  parseSearchQuery,
  rankSearchCandidates,
  resolveCategoriesFromQuery,
  resolveSynonymGroups,
  scoreSearchCandidate,
  stripSearchIntentPrefixes,
  type CatalogCategory,
  type SearchProductCandidate,
} from "./product-search.logic";
import type { CustomerAffinityProfile } from "../customer-intelligence/customer-intelligence.types";

const categories: CatalogCategory[] = [
  {
    id: "cat-fruits",
    name: "فواكه",
    slug: "fruits",
    description: "فواكه طازجة",
  },
  {
    id: "cat-veg",
    name: "خضار",
    slug: "vegetables",
    description: "خضروات",
  },
  {
    id: "cat-electronics",
    name: "إلكترونيات",
    slug: "electronics",
    description: "منتجات إلكترونية",
  },
];

function makeProduct(
  overrides: Partial<SearchProductCandidate> & { id: string; name: string },
): SearchProductCandidate {
  return {
    categoryId: "cat-electronics",
    description: "",
    tags: [],
    isRecommended: false,
    isAvailable: true,
    availability: "UNLIMITED",
    stock: 10,
    price: 100,
    hasOffer: false,
    ...overrides,
  };
}

describe("product-search.logic", () => {
  describe("normalizeArabicForSearch", () => {
    it("normalizes alef and ta marbuta variations", () => {
      expect(normalizeArabicForSearch("إلكترونيات")).toBe("الكترونيات");
      expect(normalizeArabicForSearch("فاكهة")).toBe("فاكهه");
      expect(normalizeArabicForSearch("سماعة")).toBe("سماعه");
    });

    it("collapses whitespace", () => {
      expect(normalizeArabicForSearch("  سماعات   رياضية  ")).toBe(
        "سماعات رياضيه",
      );
    });
  });

  describe("stripSearchIntentPrefixes", () => {
    it("strips common Arabic shopping prefixes", () => {
      expect(stripSearchIntentPrefixes("بدي فواكه")).toBe(
        "فواكhe".replace("he", "ه"),
      );
      expect(stripSearchIntentPrefixes("بدي فواكه")).toBe("فواكه");
      expect(stripSearchIntentPrefixes("شي اشحن فيه تلفوني")).toBe(
        "اشحن فيه تلفوني",
      );
    });
  });

  describe("resolveCategoriesFromQuery", () => {
    it("matches fruit category intent", () => {
      const matches = resolveCategoriesFromQuery("بدي فواكه", categories);
      expect(matches[0]?.categoryId).toBe("cat-fruits");
    });

    it("matches vegetables category intent", () => {
      const matches = resolveCategoriesFromQuery("خضار", categories);
      expect(matches[0]?.categoryId).toBe("cat-veg");
    });
  });

  describe("resolveSynonymGroups", () => {
    it("maps charger phrases to charger synonyms", () => {
      const groups = resolveSynonymGroups("شي اشحن فيه تلفوني");
      expect(groups.some((g) => g.id === "chargers")).toBe(true);
    });

    it("maps sports headphones query", () => {
      const groups = resolveSynonymGroups("سماعات رياضية");
      expect(groups.some((g) => g.id === "headphones")).toBe(true);
    });
  });

  describe("parseSearchQuery", () => {
    it("detects category intent for fruit query", () => {
      const parsed = parseSearchQuery("بدي فواكه", categories);
      expect(parsed.intent).toBe("category");
      expect(parsed.matchedCategoryIds).toContain("cat-fruits");
    });

    it("detects tag intent for charger query", () => {
      const parsed = parseSearchQuery("شاحن موبايل", categories);
      expect(parsed.matchedTags.length).toBeGreaterThan(0);
    });

    it("expands terms with synonyms", () => {
      const parsed = parseSearchQuery("سماعات رياضية", categories);
      expect(parsed.expandedTerms.some((t) => t.includes("سماع"))).toBe(true);
    });
  });

  describe("buildExpandedSearchTerms", () => {
    it("includes normalized and synonym keywords", () => {
      const terms = buildExpandedSearchTerms({
        cleaned: "شاحن",
        normalized: "شاحن",
        synonymKeywords: ["charger", "usb"],
        matchedTags: ["شاحن"],
      });
      expect(terms).toEqual(expect.arrayContaining(["charger", "usb", "شاحن"]));
    });
  });

  describe("scoreSearchCandidate", () => {
    it("ranks exact name match above partial match", () => {
      const parsed = parseSearchQuery("سماعات بلوتوث", categories);
      const exact = scoreSearchCandidate(
        makeProduct({
          id: "p1",
          name: "سماعات بلوتوث",
          tags: ["سماعات"],
        }),
        { parsed, intelligence: null, signalsByProduct: new Map() },
      );
      const partial = scoreSearchCandidate(
        makeProduct({
          id: "p2",
          name: "كابل USB",
          description: "مناسب للسماعات",
        }),
        { parsed, intelligence: null, signalsByProduct: new Map() },
      );
      expect(exact.relevanceScore).toBeGreaterThan(partial.relevanceScore);
    });

    it("boosts tag relevance", () => {
      const parsed = parseSearchQuery("سماعات", categories);
      const tagged = scoreSearchCandidate(
        makeProduct({
          id: "p1",
          name: "منتج صوت",
          tags: ["سماعات", "bluetooth"],
        }),
        { parsed, intelligence: null, signalsByProduct: new Map() },
      );
      const plain = scoreSearchCandidate(
        makeProduct({ id: "p2", name: "منتج آخر" }),
        { parsed, intelligence: null, signalsByProduct: new Map() },
      );
      expect(tagged.relevanceScore).toBeGreaterThan(plain.relevanceScore);
    });

    it("does not let popularity override strong relevance", () => {
      const parsed = parseSearchQuery("شاحن سريع", categories);
      const relevant = scoreSearchCandidate(
        makeProduct({
          id: "p1",
          name: "شاحن سريع",
          tags: ["شاحن"],
        }),
        {
          parsed,
          intelligence: null,
          signalsByProduct: new Map([["p1", { orderQuantity: 1 }]]),
        },
      );
      const popular = scoreSearchCandidate(
        makeProduct({ id: "p2", name: "منتج عام" }),
        {
          parsed,
          intelligence: null,
          signalsByProduct: new Map([["p2", { orderQuantity: 10000 }]]),
        },
      );
      expect(relevant.score).toBeGreaterThan(popular.score);
    });

    it("applies customer intelligence boost without exposing behavior", () => {
      const parsed = parseSearchQuery("شاحن", categories);
      const profile: CustomerAffinityProfile = {
        computedAt: new Date().toISOString(),
        hasBehavioralData: true,
        signalCount: 5,
        categories: [
          {
            id: "cat-electronics",
            label: "إلكترونيات",
            score: 4,
            recentScore: 2,
            strength: "high",
            reasons: [],
          },
        ],
        tags: [],
        products: [],
        searches: [],
        meta: { recentSignalCount: 2 },
      };
      const intelligence = buildIntelligenceContext(profile);
      const boosted = scoreSearchCandidate(
        makeProduct({
          id: "p1",
          name: "شاحن",
          categoryId: "cat-electronics",
        }),
        {
          parsed,
          intelligence,
          signalsByProduct: new Map(),
        },
      );
      const guest = scoreSearchCandidate(
        makeProduct({
          id: "p1",
          name: "شاحن",
          categoryId: "cat-electronics",
        }),
        { parsed, intelligence: null, signalsByProduct: new Map() },
      );
      expect(boosted.score).toBeGreaterThan(guest.score);
      expect(boosted.matchReason).toBeUndefined();
    });

    it("deprioritizes unavailable products", () => {
      const parsed = parseSearchQuery("شاحن", categories);
      const available = scoreSearchCandidate(
        makeProduct({
          id: "p1",
          name: "شاحن",
          isAvailable: true,
          availability: "UNLIMITED",
        }),
        { parsed, intelligence: null, signalsByProduct: new Map() },
      );
      const unavailable = scoreSearchCandidate(
        makeProduct({
          id: "p2",
          name: "شاحن",
          isAvailable: false,
          availability: "UNAVAILABLE",
          stock: 0,
        }),
        { parsed, intelligence: null, signalsByProduct: new Map() },
      );
      expect(available.score).toBeGreaterThan(unavailable.score);
    });
  });

  describe("rankSearchCandidates", () => {
    it("sorts deterministically by score then product id", () => {
      const parsed = parseSearchQuery("شاحن", categories);
      const candidates = [
        makeProduct({ id: "b", name: "منتج" }),
        makeProduct({ id: "a", name: "شاحن" }),
      ];
      const ranked = rankSearchCandidates(candidates, {
        parsed,
        intelligence: null,
        signalsByProduct: new Map(),
      });
      expect(ranked[0]?.productId).toBe("a");
    });

    it("supports fallback mode with lower threshold", () => {
      const parsed = parseSearchQuery("xyzunknown", categories);
      const candidates = [makeProduct({ id: "p1", name: "منتج عام" })];
      const strict = rankSearchCandidates(candidates, {
        parsed,
        intelligence: null,
        signalsByProduct: new Map(),
      });
      const fallback = rankSearchCandidates(
        candidates,
        {
          parsed,
          intelligence: null,
          signalsByProduct: new Map(),
        },
        { fallbackMode: true, minRelevanceScore: 0 },
      );
      expect(strict.length).toBe(0);
      expect(fallback.length).toBe(1);
    });
  });

  describe("paginateRanked", () => {
    it("paginates ranked results", () => {
      const items = [
        { productId: "1" },
        { productId: "2" },
        { productId: "3" },
      ];
      const page1 = paginateRanked(items, 1, 2);
      expect(page1.items).toHaveLength(2);
      expect(page1.totalPages).toBe(2);
      const page2 = paginateRanked(items, 2, 2);
      expect(page2.items).toHaveLength(1);
    });
  });

  describe("buildSearchSuggestions", () => {
    it("builds suggestions from categories, tags, and products", () => {
      const parsed = parseSearchQuery("بدي فواكه", categories);
      const products = [
        makeProduct({ id: "p1", name: "تفاح", categoryId: "cat-fruits" }),
      ];
      const suggestions = buildSearchSuggestions({
        parsed,
        ranked: [
          { productId: "p1", score: 10, relevanceScore: 10, boostScore: 0 },
        ],
        products,
        categories,
      });
      expect(suggestions.some((s) => s.type === "category")).toBe(true);
      expect(suggestions.some((s) => s.type === "product")).toBe(true);
    });
  });
});
