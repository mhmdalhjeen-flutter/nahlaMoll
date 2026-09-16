import { Test, TestingModule } from "@nestjs/testing";
import { ProductDiscoveryService } from "./product-discovery.service";
import { ProductsService } from "./products.service";
import { CustomerIntelligenceService } from "../customer-intelligence/customer-intelligence.service";
import { PrismaService } from "../prisma/prisma.service";
import { createMockPrismaService } from "../prisma/prisma.service.mock";
import type { CustomerAffinityProfile } from "../customer-intelligence/customer-intelligence.types";

const mockPrisma = createMockPrismaService();

const emptyProfile = (): CustomerAffinityProfile => ({
  computedAt: new Date().toISOString(),
  hasBehavioralData: false,
  signalCount: 0,
  categories: [],
  tags: [],
  products: [],
  searches: [],
  meta: { recentSignalCount: 0 },
});

describe("ProductDiscoveryService", () => {
  let service: ProductDiscoveryService;
  const buildProfile = jest.fn<
    Promise<CustomerAffinityProfile>,
    [{ userId?: string }]
  >();

  beforeEach(async () => {
    buildProfile.mockResolvedValue(emptyProfile());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductDiscoveryService,
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: CustomerIntelligenceService,
          useValue: { buildProfile, hasBehavioralData: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ProductDiscoveryService);
    jest.clearAllMocks();
    buildProfile.mockResolvedValue(emptyProfile());
  });

  function mockPopularityAggregates() {
    mockPrisma.orderItem.groupBy.mockResolvedValue([
      { productId: "p1", _sum: { quantity: 10 } },
      { productId: "p2", _sum: { quantity: 5 } },
      { productId: "p3", _sum: { quantity: 3 } },
    ]);
    mockPrisma.favorite.groupBy.mockResolvedValue([
      { productId: "p4", _count: { productId: 4 } },
      { productId: "p5", _count: { productId: 2 } },
      { productId: "p6", _count: { productId: 1 } },
    ]);
  }

  it("returns diversified store-level sections for guests", async () => {
    mockPopularityAggregates();
    mockPrisma.product.findMany.mockImplementation(
      ({ where }: { where?: { id?: { in?: string[] } } }) => {
        const ids = where?.id?.in ?? [];
        return Promise.resolve(
          ids.map((id) => ({
            id,
            categoryId: "c1",
            variants: [],
            category: null,
          })),
        );
      },
    );

    const feed = await service.buildFeed(undefined, {});

    expect(feed.meta.hasPersonalData).toBe(false);
    expect(feed.sections.some((s) => s.sectionType === "most_ordered")).toBe(
      true,
    );
    expect(
      feed.sections.find((s) => s.sectionType === "most_ordered")?.products[0]
        ?.recommendationReason,
    ).toBe("شائع بين العملاء");
  });

  it("omits sections when insufficient products", async () => {
    mockPrisma.orderItem.groupBy.mockResolvedValue([
      { productId: "p1", _sum: { quantity: 1 } },
    ]);
    mockPrisma.favorite.groupBy.mockResolvedValue([]);

    const feed = await service.buildFeed(undefined, {});

    expect(feed.sections).toHaveLength(0);
  });

  it("personalized section uses intelligence profile and excludes interacted products", async () => {
    buildProfile.mockResolvedValue({
      ...emptyProfile(),
      hasBehavioralData: true,
      signalCount: 3,
      categories: [
        {
          id: "phones",
          label: "Phones",
          score: 4,
          recentScore: 1,
          strength: "high",
          reasons: [],
        },
      ],
      products: [
        {
          id: "fav-1",
          score: 3,
          recentScore: 1,
          strength: "medium",
          reasons: ["Added to favorites"],
        },
      ],
    });

    mockPopularityAggregates();
    mockPrisma.review.groupBy.mockResolvedValue([]);

    mockPrisma.category.findMany
      .mockResolvedValueOnce([{ id: "phones", parentId: "electronics" }])
      .mockResolvedValueOnce([{ id: "accessories" }]);

    mockPrisma.product.findMany.mockImplementation(
      ({ where }: { where?: { id?: { notIn?: string[]; in?: string[] } } }) => {
        if (where?.id?.in) {
          return Promise.resolve(
            where.id.in.map((id) => ({
              id,
              categoryId: "accessories",
              tags: ["phone"],
              variants: [],
              category: { name: "Accessories" },
              isRecommended: false,
              freeDeliveryValue: 10,
              hasOffer: false,
              offerStartDate: null,
              offerEndDate: null,
              name: id === "related-1" ? "Phone Charger" : "Case",
            })),
          );
        }

        const excluded = new Set(where?.id?.notIn ?? []);
        expect(excluded.has("fav-1")).toBe(true);
        return Promise.resolve([
          {
            id: "related-1",
            categoryId: "accessories",
            tags: ["phone", "charger"],
            variants: [],
            category: { name: "Accessories" },
            isRecommended: false,
            freeDeliveryValue: 10,
            hasOffer: false,
            offerStartDate: null,
            offerEndDate: null,
            name: "Phone Charger",
          },
          {
            id: "related-2",
            categoryId: "accessories",
            tags: ["case"],
            variants: [],
            category: { name: "Accessories" },
            isRecommended: true,
            freeDeliveryValue: 5,
            hasOffer: false,
            offerStartDate: null,
            offerEndDate: null,
            name: "Phone Case",
          },
        ]);
      },
    );

    const feed = await service.buildFeed("user-1", {});

    const personalized = feed.sections.find(
      (s) => s.sectionType === "personalized",
    );
    expect(personalized).toBeDefined();
    expect(personalized!.products.every((p) => p.id !== "fav-1")).toBe(true);
    expect(personalized!.products.length).toBeGreaterThanOrEqual(2);
    expect(personalized!.products[0].recommendationReason).toBeTruthy();
  });

  it("free-delivery section excludes cart products and uses intelligence affinity", async () => {
    buildProfile.mockResolvedValue({
      ...emptyProfile(),
      categories: [
        {
          id: "phones",
          label: "Phones",
          score: 2,
          recentScore: 1,
          strength: "medium",
          reasons: [],
        },
      ],
    });

    mockPopularityAggregates();
    mockPrisma.review.groupBy.mockResolvedValue([]);

    mockPrisma.product.findMany.mockImplementation(
      ({ where }: { where?: { id?: { in?: string[]; notIn?: string[] } } }) => {
        if (where?.id?.in) {
          if (where.id.in.includes("cart-p1")) {
            return Promise.resolve([{ categoryId: "phones" }]);
          }
          return Promise.resolve(
            where.id.in.map((id) => ({
              id,
              categoryId: "phones",
              name: id,
              tags: [],
              variants: [],
              category: null,
              freeDeliveryValue: id === "boost-1" ? 25 : 20,
              isRecommended: false,
              hasOffer: false,
              offerStartDate: null,
              offerEndDate: null,
            })),
          );
        }
        const excluded = new Set(where?.id?.notIn ?? []);
        expect(excluded.has("cart-p1")).toBe(true);
        return Promise.resolve([
          {
            id: "boost-1",
            categoryId: "phones",
            name: "Boost 1",
            tags: [],
            variants: [],
            category: null,
            freeDeliveryValue: 25,
            isRecommended: false,
            hasOffer: false,
            offerStartDate: null,
            offerEndDate: null,
          },
          {
            id: "boost-2",
            categoryId: "phones",
            name: "Boost 2",
            tags: [],
            variants: [],
            category: null,
            freeDeliveryValue: 20,
            isRecommended: false,
            hasOffer: false,
            offerStartDate: null,
            offerEndDate: null,
          },
        ]);
      },
    );

    const feed = await service.buildFeed("user-1", {
      cartProductIds: "cart-p1",
      displayProgress: 50,
      remainingScore: 30,
    });

    const boost = feed.sections.find(
      (s) => s.sectionType === "free_delivery_boost",
    );
    expect(boost).toBeDefined();
    expect(boost!.title).toBe("🚚 ممكن يساعدك في التوصيل المجاني");
    expect(boost!.products.every((p) => p.id !== "cart-p1")).toBe(true);
    expect(boost!.products[0].recommendationReason).toBeTruthy();
  });
});
