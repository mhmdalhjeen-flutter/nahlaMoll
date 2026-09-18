import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = {
  customerNotificationPreferences: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

describe("NotificationsService", () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it("creates defaults on first read without overwriting existing rows", async () => {
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue({
      inAppEnabled: true,
      orderUpdates: true,
      freeDelivery: true,
      favorites: false,
      offers: false,
      personalRecommendations: false,
      newProducts: false,
      abuAlaaNews: false,
      pushEnabled: false,
      emailEnabled: false,
      doNotDisturbEnabled: false,
      doNotDisturbFrom: "22:00",
      doNotDisturbUntil: "08:00",
      updatedAt: new Date("2026-09-07T10:00:00.000Z"),
    });

    const result = await service.getPreferences("user-1");

    expect(result.orderUpdates).toBe(true);
    expect(result.offers).toBe(false);
    expect(
      mockPrisma.customerNotificationPreferences.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        update: {},
      }),
    );
  });

  it("updates only provided preference fields for the authenticated user", async () => {
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue({});
    mockPrisma.customerNotificationPreferences.update.mockResolvedValue({
      inAppEnabled: true,
      orderUpdates: true,
      freeDelivery: false,
      favorites: true,
      offers: false,
      personalRecommendations: false,
      newProducts: false,
      abuAlaaNews: false,
      pushEnabled: false,
      emailEnabled: false,
      doNotDisturbEnabled: true,
      doNotDisturbFrom: "22:00",
      doNotDisturbUntil: "08:00",
      updatedAt: new Date("2026-09-07T11:00:00.000Z"),
    });

    const result = await service.updatePreferences("user-1", {
      freeDelivery: false,
      favorites: true,
    });

    expect(result.freeDelivery).toBe(false);
    expect(result.favorites).toBe(true);
    expect(
      mockPrisma.customerNotificationPreferences.update,
    ).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { freeDelivery: false, favorites: true },
    });
  });
});
