import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { SettingsService } from "./settings.service";
import { PrismaService } from "../prisma/prisma.service";
import { createMockPrismaService } from "../prisma/prisma.service.mock";
import { FREE_DELIVERY_PROGRESS_TARGET } from "../delivery/delivery.constants";

const mockPrisma = createMockPrismaService();

describe("SettingsService", () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  describe("getSettings", () => {
    it("should create default settings if none exist", async () => {
      mockPrisma.settings.findFirst.mockResolvedValue(null);
      mockPrisma.settings.create.mockResolvedValue({
        id: "default",
        storeName: "متجر",
        freeDeliveryTarget: new Prisma.Decimal(FREE_DELIVERY_PROGRESS_TARGET),
        partialFreeDeliveryThreshold: new Prisma.Decimal(0),
        partialFreeDeliveryDiscount: 0,
        partialFreeDeliveryEnabled: false,
      });

      const result = await service.getSettings();

      expect(result.storeName).toBe("متجر");
      expect(mockPrisma.settings.create).toHaveBeenCalled();
    });
  });

  describe("updateSettings", () => {
    it("forces free delivery target to 100 and disables partial tier", async () => {
      mockPrisma.settings.findFirst.mockResolvedValue({
        id: "default",
        storeName: "متجر",
        freeDeliveryTarget: new Prisma.Decimal(10),
        partialFreeDeliveryThreshold: new Prisma.Decimal(5),
        partialFreeDeliveryDiscount: 50,
        partialFreeDeliveryEnabled: true,
      });
      mockPrisma.settings.update.mockResolvedValue({});

      await service.updateSettings({
        storeName: "جاكو",
      });

      expect(mockPrisma.settings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            freeDeliveryTarget: new Prisma.Decimal(100),
            partialFreeDeliveryEnabled: false,
          }),
        }),
      );
    });
  });

  describe("getDeliverySettings", () => {
    it("returns fixed percentage model settings", async () => {
      mockPrisma.settings.findFirst.mockResolvedValue({
        id: "default",
        storeName: "متجر",
        freeDeliveryTarget: new Prisma.Decimal(10),
        partialFreeDeliveryEnabled: true,
        partialFreeDeliveryThreshold: new Prisma.Decimal(5),
        partialFreeDeliveryDiscount: 50,
      });

      const result = await service.getDeliverySettings();
      expect(result).toEqual({
        freeDeliveryTarget: 100,
        partialFreeDeliveryEnabled: false,
        partialFreeDeliveryThreshold: 0,
        partialFreeDeliveryDiscount: 0,
      });
    });
  });
});
