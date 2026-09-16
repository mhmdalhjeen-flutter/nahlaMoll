import { Test, TestingModule } from "@nestjs/testing";
import { ProductSearchService } from "./product-search.service";
import { ProductsService } from "./products.service";
import { CustomerIntelligenceService } from "../customer-intelligence/customer-intelligence.service";
import { PrismaService } from "../prisma/prisma.service";
import { createMockPrismaService } from "../prisma/prisma.service.mock";
import { ValidationException } from "../../common/exceptions/business.exception";

const mockPrisma = createMockPrismaService();

describe("ProductSearchService", () => {
  let service: ProductSearchService;
  const productsService = {
    findManyByIds: jest.fn(),
  };
  const customerIntelligenceService = {
    buildProfile: jest.fn(),
    hasBehavioralData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSearchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProductsService, useValue: productsService },
        {
          provide: CustomerIntelligenceService,
          useValue: customerIntelligenceService,
        },
      ],
    }).compile();

    service = module.get(ProductSearchService);
    jest.clearAllMocks();

    mockPrisma.category.findMany.mockResolvedValue([
      {
        id: "cat-fruits",
        name: "فواكه",
        slug: "fruits",
        description: "فواكه طازجة",
        nameEn: "Fruits",
        parentId: null,
      },
      {
        id: "cat-electronics",
        name: "إلكترونيات",
        slug: "electronics",
        description: "منتجات إلكترونية",
        nameEn: "Electronics",
        parentId: null,
      },
    ]);

    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.orderItem.groupBy.mockResolvedValue([]);
    mockPrisma.favorite.groupBy.mockResolvedValue([]);
    mockPrisma.review.groupBy.mockResolvedValue([]);
    customerIntelligenceService.buildProfile.mockResolvedValue({
      hasBehavioralData: false,
      signalCount: 0,
      categories: [],
      tags: [],
      products: [],
      searches: [],
      meta: { recentSignalCount: 0 },
      computedAt: new Date().toISOString(),
    });
    customerIntelligenceService.hasBehavioralData.mockResolvedValue(false);
    productsService.findManyByIds.mockResolvedValue([]);
  });

  it("rejects queries shorter than 2 characters", async () => {
    await expect(service.search({ q: "a" })).rejects.toThrow(
      ValidationException,
    );
  });

  it("returns structured search response with meta", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "p1",
        name: "شاحن سريع",
        nameEn: "Fast Charger",
        description: "شاحن USB",
        descriptionEn: null,
        categoryId: "cat-electronics",
        tags: ["شاحن", "charger"],
        isRecommended: false,
        isAvailable: true,
        availability: "UNLIMITED",
        stock: 10,
        price: 50,
        hasOffer: false,
        offerStartDate: null,
        offerEndDate: null,
        category: {
          id: "cat-electronics",
          name: "إلكترونيات",
          slug: "electronics",
        },
      },
    ]);
    productsService.findManyByIds.mockResolvedValue([
      { id: "p1", name: "شاحن سريع", category: { name: "إلكترونيات" } },
    ]);

    const result = await service.search({ q: "شاحن" });

    expect(result.products).toHaveLength(1);
    expect(result.meta.intent).toBeDefined();
    expect(result.meta.normalizedQuery).toBe("شاحن");
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("uses category fallback when text search has no matches", async () => {
    mockPrisma.product.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "p-apple",
          name: "تفاح",
          nameEn: "Apple",
          description: "",
          descriptionEn: null,
          categoryId: "cat-fruits",
          tags: ["فواكه"],
          isRecommended: true,
          isAvailable: true,
          availability: "UNLIMITED",
          stock: 20,
          price: 10,
          hasOffer: false,
          offerStartDate: null,
          offerEndDate: null,
          category: { id: "cat-fruits", name: "فواكه", slug: "fruits" },
        },
      ]);

    productsService.findManyByIds.mockResolvedValue([
      { id: "p-apple", name: "تفاح" },
    ]);

    const result = await service.search({ q: "بدي فواكه" });

    expect(result.meta.fallbackUsed).toBe(true);
    expect(result.products.length).toBeGreaterThanOrEqual(0);
  });

  it("passes userId for personalization lookup", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "p1",
        name: "شاحن",
        nameEn: null,
        description: "",
        descriptionEn: null,
        categoryId: "cat-electronics",
        tags: ["شاحن"],
        isRecommended: false,
        isAvailable: true,
        availability: "UNLIMITED",
        stock: 5,
        price: 20,
        hasOffer: false,
        offerStartDate: null,
        offerEndDate: null,
        category: {
          id: "cat-electronics",
          name: "إلكترونيات",
          slug: "electronics",
        },
      },
    ]);
    productsService.findManyByIds.mockResolvedValue([
      { id: "p1", name: "شاحن" },
    ]);
    customerIntelligenceService.buildProfile.mockResolvedValue({
      hasBehavioralData: true,
      signalCount: 4,
      categories: [
        {
          id: "cat-electronics",
          label: "إلكترونيات",
          score: 3,
          recentScore: 2,
          strength: "high",
          reasons: [],
        },
      ],
      tags: [],
      products: [],
      searches: [],
      meta: { recentSignalCount: 2 },
      computedAt: new Date().toISOString(),
    });

    const result = await service.search({ q: "شاحن" }, { userId: "user-1" });

    expect(customerIntelligenceService.buildProfile).toHaveBeenCalledTimes(1);
    expect(customerIntelligenceService.buildProfile).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: undefined,
    });
    expect(customerIntelligenceService.hasBehavioralData).not.toHaveBeenCalled();
    expect(result.meta.hasPersonalization).toBe(true);
  });

  it("paginates results", async () => {
    const rows = Array.from({ length: 5 }).map((_, i) => ({
      id: `p${i}`,
      name: `شاحن ${i}`,
      nameEn: null,
      description: "شاحن",
      descriptionEn: null,
      categoryId: "cat-electronics",
      tags: ["شاحن"],
      isRecommended: false,
      isAvailable: true,
      availability: "UNLIMITED",
      stock: 1,
      price: 10,
      hasOffer: false,
      offerStartDate: null,
      offerEndDate: null,
      category: {
        id: "cat-electronics",
        name: "إلكترونيات",
        slug: "electronics",
      },
    }));
    mockPrisma.product.findMany.mockResolvedValue(rows);
    productsService.findManyByIds.mockImplementation(async (ids: string[]) =>
      ids.map((id) => ({ id, name: `شاحن ${id}` })),
    );

    const result = await service.search({ q: "شاحن", page: 1, limit: 2 });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.products.length).toBeLessThanOrEqual(2);
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
  });
});
