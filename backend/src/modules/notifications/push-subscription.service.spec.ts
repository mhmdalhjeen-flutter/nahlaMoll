import { Test, TestingModule } from "@nestjs/testing";
import { PushSubscriptionService } from "./push-subscription.service";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = {
  pushSubscription: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe("PushSubscriptionService", () => {
  let service: PushSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushSubscriptionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PushSubscriptionService);
    jest.clearAllMocks();
  });

  it("registers a subscription for the authenticated user", async () => {
    mockPrisma.pushSubscription.upsert.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      endpoint: "https://push.example/1",
    });

    const result = await service.register("user-1", {
      endpoint: "https://push.example/1",
      keys: { p256dh: "key", auth: "auth" },
      userAgent: "TestAgent",
    });

    expect(result.userId).toBe("user-1");
    expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoint: "https://push.example/1" },
        create: expect.objectContaining({ userId: "user-1" }),
        update: expect.objectContaining({
          userId: "user-1",
          invalidatedAt: null,
        }),
      }),
    );
  });

  it("reactivates an invalidated subscription on re-register", async () => {
    await service.register("user-2", {
      endpoint: "https://push.example/2",
      keys: { p256dh: "k2", auth: "a2" },
    });

    expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ invalidatedAt: null }),
      }),
    );
  });

  it("deactivates only the current user's subscription", async () => {
    mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.deactivate(
      "user-1",
      "https://push.example/1",
    );

    expect(result).toEqual({ deactivated: true });
    expect(mockPrisma.pushSubscription.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        endpoint: "https://push.example/1",
        invalidatedAt: null,
      },
      data: { invalidatedAt: expect.any(Date) },
    });
  });

  it("lists only active subscriptions for a user", async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([{ id: "sub-1" }]);

    const result = await service.listActiveForUser("user-1");

    expect(result).toHaveLength(1);
    expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", invalidatedAt: null },
      orderBy: { createdAt: "asc" },
    });
  });
});
