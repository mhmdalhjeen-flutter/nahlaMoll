import { Test, TestingModule } from "@nestjs/testing";
import { DeliveryService, FreeDeliveryCalculation } from "./delivery.service";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { createMockPrismaService } from "../prisma/prisma.service.mock";
import {
  FREE_DELIVERY_ELIGIBILITY_THRESHOLD,
  FREE_DELIVERY_PROGRESS_TARGET,
} from "./delivery.constants";

const mockPrisma = createMockPrismaService();
const mockSettingsService = {
  getDeliverySettings: jest.fn(),
};

describe("DeliveryService", () => {
  let service: DeliveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
    jest.clearAllMocks();
  });

  const baseArea = {
    id: "area-1",
    isActive: true,
    deliveryFee: 20,
    eligibleForFreeDelivery: true,
  };

  describe("calculateScoreResult — percentage model", () => {
    it.each([
      [0, false, 0, 0, 100],
      [50, false, 50, 50, 50],
      [94, false, 94, 94, 6],
      [95, true, 95, 95, 5],
      [99, true, 99, 99, 1],
      [100, true, 100, 100, 0],
      [120, true, 100, 100, 0],
      [250, true, 100, 100, 0],
    ])(
      "raw=%s → free=%s, display=%s, progress=%s, remaining=%s",
      (raw, free, display, progress, remaining) => {
        const result = service.calculateScoreResult(raw, undefined, baseArea);
        expect(result).toMatchObject({
          actualScore: raw,
          displayedScore: display,
          target: FREE_DELIVERY_PROGRESS_TARGET,
          progressPercentage: progress,
          remainingScore: remaining,
          isFreeDelivery: free,
          isPartialFreeDelivery: false,
          deliveryFee: free ? 0 : 20,
        });
      },
    );

    it("never applies partial delivery discount", () => {
      const result = service.calculateScoreResult(75, undefined, baseArea);
      expect(result.isPartialFreeDelivery).toBe(false);
      expect(result.isFreeDelivery).toBe(false);
      expect(result.deliveryFee).toBe(20);
      expect(result.partialEnabled).toBe(false);
    });

    it("does not grant free delivery for ineligible area at 120%", () => {
      const result = service.calculateScoreResult(120, undefined, {
        ...baseArea,
        eligibleForFreeDelivery: false,
      });
      expect(result).toMatchObject({
        actualScore: 120,
        displayedScore: 100,
        progressPercentage: 100,
        areaEligibility: false,
        deliveryFee: 20,
        isFreeDelivery: false,
      });
    });
  });

  describe("calculateFreeDelivery", () => {
    it("calculates actualScore from DB cart items", async () => {
      mockPrisma.deliveryArea.findFirst.mockResolvedValue(baseArea);
      mockPrisma.cartItem.findMany.mockResolvedValue([
        {
          id: "ci1",
          quantity: 2,
          product: { freeDeliveryValue: 30 },
        },
        {
          id: "ci2",
          quantity: 1,
          product: { freeDeliveryValue: 35 },
        },
      ]);

      const result: FreeDeliveryCalculation =
        await service.calculateFreeDelivery("user-1", "area-1");

      expect(result.actualScore).toBe(95);
      expect(result.isFreeDelivery).toBe(true);
      expect(result.deliveryFee).toBe(0);
    });

    it("60% × 2 = 120 → display 100 → free", async () => {
      mockPrisma.deliveryArea.findFirst.mockResolvedValue(baseArea);
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { quantity: 2, product: { freeDeliveryValue: 60 } },
      ]);
      const result = await service.calculateFreeDelivery("user-1", "area-1");
      expect(result.actualScore).toBe(120);
      expect(result.displayedScore).toBe(100);
      expect(result.progressPercentage).toBe(100);
      expect(result.isFreeDelivery).toBe(true);
    });

    it("40 + 55 = 95 → free", async () => {
      mockPrisma.deliveryArea.findFirst.mockResolvedValue(baseArea);
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { quantity: 1, product: { freeDeliveryValue: 40 } },
        { quantity: 1, product: { freeDeliveryValue: 55 } },
      ]);
      const result = await service.calculateFreeDelivery("user-1", "area-1");
      expect(result.actualScore).toBe(95);
      expect(result.isFreeDelivery).toBe(true);
    });

    it("ignores free delivery for ineligible area at 200%", async () => {
      mockPrisma.deliveryArea.findFirst.mockResolvedValue({
        ...baseArea,
        eligibleForFreeDelivery: false,
      });
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { quantity: 1, product: { freeDeliveryValue: 200 } },
      ]);

      const result = await service.calculateFreeDelivery("user-1", "area-1");

      expect(result.areaEligibility).toBe(false);
      expect(result.isFreeDelivery).toBe(false);
      expect(result.deliveryFee).toBe(20);
    });
  });

  describe("geographic regions", () => {
    it("returns four stable region codes", () => {
      expect(service.getGeographicRegions()).toEqual([
        "NORTH",
        "GAZA",
        "MIDDLE",
        "SOUTH",
      ]);
    });
  });

  describe("eligibility threshold constant", () => {
    it("uses 95 as eligibility threshold", () => {
      expect(FREE_DELIVERY_ELIGIBILITY_THRESHOLD).toBe(95);
      const below = service.calculateScoreResult(94, undefined, baseArea);
      const at = service.calculateScoreResult(95, undefined, baseArea);
      expect(below.isFreeDelivery).toBe(false);
      expect(at.isFreeDelivery).toBe(true);
    });
  });
});
