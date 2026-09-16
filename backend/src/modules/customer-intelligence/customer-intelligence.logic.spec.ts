import { CustomerInteractionType } from "@prisma/client";
import {
  buildAffinityProfileFromSignals,
  buildDedupeKey,
  normalizeSearchTerm,
  recencyDecay,
  resolveSignals,
} from "./customer-intelligence.logic";
import { INTELLIGENCE_HALF_LIFE_DAYS } from "./customer-intelligence.constants";

describe("customer-intelligence.logic", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");

  it("normalizes search terms", () => {
    expect(normalizeSearchTerm("  Green   Tea ")).toBe("green tea");
  });

  it("applies exponential recency decay", () => {
    expect(recencyDecay(0, INTELLIGENCE_HALF_LIFE_DAYS)).toBe(1);
    expect(
      recencyDecay(INTELLIGENCE_HALF_LIFE_DAYS, INTELLIGENCE_HALF_LIFE_DAYS),
    ).toBe(0.5);
  });

  it("dedupes chatbot and store product clicks in the same window", () => {
    const createdAt = new Date("2026-09-07T10:00:00.000Z");
    const signals = resolveSignals([
      {
        type: CustomerInteractionType.CHAT_PRODUCT_CLICK,
        createdAt,
        productId: "p1",
        source: "chatbot",
      },
      {
        type: CustomerInteractionType.PRODUCT_CLICKED,
        createdAt: new Date("2026-09-07T10:30:00.000Z"),
        productId: "p1",
        source: "store",
      },
    ]);

    expect(signals).toHaveLength(1);
    expect(signals[0].baseWeight).toBe(2.5);
  });

  it("dedupes chat search and store search for the same term", () => {
    const createdAt = new Date("2026-09-07T10:00:00.000Z");
    const signals = resolveSignals([
      {
        type: CustomerInteractionType.CHAT_SEARCH,
        createdAt,
        searchTerm: "Tea",
      },
      {
        type: CustomerInteractionType.SEARCH_QUERY,
        createdAt: new Date("2026-09-07T10:15:00.000Z"),
        searchTerm: "tea",
      },
    ]);

    expect(signals).toHaveLength(1);
    expect(signals[0].searchTerm).toBe("Tea");
  });

  it("drops product views when stronger engagement exists in the same bucket", () => {
    const createdAt = new Date("2026-09-07T10:00:00.000Z");
    const signals = resolveSignals([
      {
        type: CustomerInteractionType.PRODUCT_VIEWED,
        createdAt,
        productId: "p1",
      },
      {
        type: CustomerInteractionType.PRODUCT_CLICKED,
        createdAt: new Date("2026-09-07T10:10:00.000Z"),
        productId: "p1",
      },
    ]);

    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe(CustomerInteractionType.PRODUCT_CLICKED);
  });

  it("builds explainable category and product scores with recent vs older split", () => {
    const signals = resolveSignals([
      {
        type: CustomerInteractionType.CATEGORY_CLICKED,
        createdAt: new Date("2026-09-06T12:00:00.000Z"),
        categoryId: "cat-phones",
      },
      {
        type: CustomerInteractionType.FAVORITE_ADDED,
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
        productId: "p-old",
        categoryId: "cat-phones",
        tags: ["phone"],
      },
    ]);

    const profile = buildAffinityProfileFromSignals(signals, {
      userId: "user-1",
      now,
      categoryLabels: new Map([["cat-phones", "Phones"]]),
      productLabels: new Map([["p-old", "Old Phone"]]),
    });

    expect(profile.hasBehavioralData).toBe(true);
    expect(profile.categories[0].id).toBe("cat-phones");
    expect(profile.categories[0].reasons[0]).toContain("Browsed category");
    expect(profile.categories[0].recentScore).toBeGreaterThan(0);
    expect(profile.products[0].recentScore).toBe(0);
    expect(profile.tags.some((t) => t.id === "phone")).toBe(true);
  });

  it("returns cold-start profile when fewer than two signals remain", () => {
    const signals = resolveSignals([
      {
        type: CustomerInteractionType.PRODUCT_VIEWED,
        createdAt: now,
        productId: "p1",
      },
    ]);

    const profile = buildAffinityProfileFromSignals(signals, { now });
    expect(profile.hasBehavioralData).toBe(false);
    expect(profile.signalCount).toBe(1);
  });

  it("uses distinct dedupe keys across time buckets", () => {
    const keyA = buildDedupeKey({
      type: CustomerInteractionType.SEARCH_QUERY,
      createdAt: new Date("2026-09-07T10:00:00.000Z"),
      searchTerm: "tea",
    });
    const keyB = buildDedupeKey({
      type: CustomerInteractionType.SEARCH_QUERY,
      createdAt: new Date("2026-09-07T15:00:00.000Z"),
      searchTerm: "tea",
    });

    expect(keyA).not.toBe(keyB);
  });
});
