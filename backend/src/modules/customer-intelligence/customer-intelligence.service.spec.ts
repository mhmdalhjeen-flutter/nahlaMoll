import { Test, TestingModule } from "@nestjs/testing";
import { CustomerInteractionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CustomerIntelligenceService } from "./customer-intelligence.service";

describe("CustomerIntelligenceService", () => {
  let service: CustomerIntelligenceService;
  const prisma = {
    customerInteraction: { findMany: jest.fn() },
    favorite: { findMany: jest.fn() },
    cartItem: { findMany: jest.fn() },
    orderItem: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    category: { findMany: jest.fn() },
  };

  const now = new Date("2026-09-07T12:00:00.000Z");

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerIntelligenceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CustomerIntelligenceService);

    prisma.product.findMany.mockResolvedValue([]);
    prisma.category.findMany.mockResolvedValue([]);
    prisma.favorite.findMany.mockResolvedValue([]);
    prisma.cartItem.findMany.mockResolvedValue([]);
    prisma.orderItem.findMany.mockResolvedValue([]);
  });

  it("builds authenticated profile from events", async () => {
    prisma.customerInteraction.findMany.mockResolvedValue([
      {
        type: CustomerInteractionType.SEARCH_QUERY,
        createdAt: new Date("2026-09-06T12:00:00.000Z"),
        productId: null,
        categoryId: null,
        searchTerm: "green tea",
        source: "search",
        metadata: null,
      },
      {
        type: CustomerInteractionType.SEARCH_RESULT_CLICK,
        createdAt: new Date("2026-09-06T12:05:00.000Z"),
        productId: "p1",
        categoryId: "c1",
        searchTerm: "green tea",
        source: "search",
        metadata: null,
      },
    ]);
    prisma.product.findMany.mockResolvedValue([
      { id: "p1", categoryId: "c1", tags: ["tea"] },
    ]);
    prisma.category.findMany.mockResolvedValue([{ id: "c1", name: "Drinks" }]);

    const profile = await service.buildProfile({ userId: "user-1", now });

    expect(profile.hasBehavioralData).toBe(true);
    expect(profile.searches[0].id).toBe("green tea");
    expect(profile.products[0].id).toBe("p1");
    expect(profile.categories[0].label).toBe("Drinks");
  });

  it("builds guest session profile without supplemental commerce data", async () => {
    prisma.customerInteraction.findMany.mockResolvedValue([
      {
        type: CustomerInteractionType.PRODUCT_VIEWED,
        createdAt: new Date("2026-09-07T11:00:00.000Z"),
        productId: "p1",
        categoryId: "c1",
        searchTerm: null,
        source: "product_detail",
        metadata: null,
      },
      {
        type: CustomerInteractionType.CATEGORY_VIEWED,
        createdAt: new Date("2026-09-07T11:05:00.000Z"),
        productId: null,
        categoryId: "c1",
        searchTerm: null,
        source: "category",
        metadata: null,
      },
    ]);
    prisma.product.findMany.mockResolvedValue([
      { id: "p1", categoryId: "c1", tags: [] },
    ]);

    const profile = await service.buildProfile({
      sessionId: "sess-guest",
      now,
    });

    expect(profile.sessionId).toBe("sess-guest");
    expect(profile.hasBehavioralData).toBe(true);
    expect(prisma.favorite.findMany).not.toHaveBeenCalled();
  });

  it("adds supplemental favorites only when no matching event exists", async () => {
    prisma.customerInteraction.findMany.mockResolvedValue([]);
    prisma.favorite.findMany.mockResolvedValue([
      {
        productId: "p1",
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
        product: { categoryId: "c1", tags: ["legacy"] },
      },
      {
        productId: "p2",
        createdAt: new Date("2026-08-02T12:00:00.000Z"),
        product: { categoryId: "c1", tags: [] },
      },
    ]);
    prisma.product.findMany.mockResolvedValue([
      { id: "p1", categoryId: "c1", tags: ["legacy"] },
      { id: "p2", categoryId: "c1", tags: [] },
    ]);

    const profile = await service.buildProfile({ userId: "user-1", now });

    expect(profile.hasBehavioralData).toBe(true);
    expect(profile.products).toHaveLength(2);
    expect(profile.products[0].reasons[0]).toContain("account history");
  });

  it("expands order events with productIds metadata", async () => {
    prisma.customerInteraction.findMany.mockResolvedValue([
      {
        type: CustomerInteractionType.ORDER_CREATED,
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        productId: null,
        categoryId: null,
        searchTerm: null,
        source: "server",
        metadata: { orderId: "o1", productIds: ["p1", "p2"] },
      },
      {
        type: CustomerInteractionType.PRODUCT_VIEWED,
        createdAt: new Date("2026-09-07T11:00:00.000Z"),
        productId: "p9",
        categoryId: null,
        searchTerm: null,
        source: "store",
        metadata: null,
      },
    ]);
    prisma.product.findMany.mockResolvedValue([
      { id: "p1", categoryId: "c1", tags: [] },
      { id: "p2", categoryId: "c1", tags: [] },
      { id: "p9", categoryId: "c2", tags: [] },
    ]);

    const profile = await service.buildProfile({ userId: "user-1", now });

    expect(profile.products.map((p) => p.id).sort()).toEqual([
      "p1",
      "p2",
      "p9",
    ]);
    expect(profile.products.find((p) => p.id === "p1")?.reasons[0]).toContain(
      "Purchased",
    );
  });

  it("reports cold start when no signals exist", async () => {
    prisma.customerInteraction.findMany.mockResolvedValue([]);

    const profile = await service.buildProfile({ userId: "user-new", now });

    expect(profile.hasBehavioralData).toBe(false);
    expect(profile.signalCount).toBe(0);
  });
});
