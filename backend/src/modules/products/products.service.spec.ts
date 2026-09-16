import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";
import { ProductsService } from "./products.service";
import { PrismaService } from "../prisma/prisma.service";
import { createMockPrismaService } from "../prisma/prisma.service.mock";
import {
  ResourceNotFoundException,
  ValidationException,
} from "../../common/exceptions/business.exception";
import { ProductAvailability } from "@prisma/client";

const mockPrisma = createMockPrismaService();

describe("ProductsService", () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a product with variants", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: "cat-1",
        isActive: true,
      });
      mockPrisma.product.create.mockResolvedValue({ id: "prod-1" });

      const dto = {
        name: "Product",
        description: "Desc",
        categoryId: "cat-1",
        price: 100,
        availability: ProductAvailability.UNLIMITED,
        variants: [{ name: "Red", value: "#f00", type: "color", stock: 5 }],
      } as any;

      const result = await service.create(dto);

      expect(result.id).toBe("prod-1");
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Product",
            price: new Prisma.Decimal(100),
            categoryId: "cat-1",
            variants: {
              create: [expect.objectContaining({ name: "Red", stock: 5 })],
            },
          }),
          include: expect.anything(),
        }),
      );
    });

    it("should reject creation when category is missing", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          name: "P",
          description: "D",
          categoryId: "missing",
          price: 10,
          availability: ProductAvailability.UNLIMITED,
        } as any),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it("should reject limited product without stock >= 0", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1" });

      await expect(
        service.create({
          name: "P",
          description: "D",
          categoryId: "cat-1",
          price: 10,
          availability: ProductAvailability.LIMITED,
          stock: -1,
        } as any),
      ).rejects.toThrow(ValidationException);
    });

    it("should create a product without offer when offerValue is omitted", async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
      mockPrisma.product.create.mockResolvedValue({ id: "prod-2" });

      await service.create({
        name: "No Offer Product",
        description: "Desc",
        categoryId: "cat-1",
        price: 10,
        stock: 50,
        availability: ProductAvailability.LIMITED,
        hasOffer: false,
      } as any);

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: new Prisma.Decimal(10),
            stock: 50,
            hasOffer: false,
            offerType: null,
            offerValue: null,
          }),
        }),
      );
    });
  });

  describe("update", () => {
    it("should clear offer fields without DecimalError when hasOffer is false", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: "prod-1",
        availability: ProductAvailability.LIMITED,
        stock: 50,
        hasOffer: true,
        offerType: "PERCENTAGE",
        offerValue: new Prisma.Decimal(30),
        offerStartDate: null,
        offerEndDate: null,
      });
      mockPrisma.product.update.mockResolvedValue({
        id: "prod-1",
        price: new Prisma.Decimal(10),
      });

      await service.update("prod-1", {
        hasOffer: false,
        price: 10,
        stock: 50,
      } as any);

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hasOffer: false,
            offerType: null,
            offerValue: null,
            price: new Prisma.Decimal(10),
            stock: 50,
          }),
        }),
      );
    });

    it("should preserve base price separately from offer value", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: "prod-1",
        availability: ProductAvailability.LIMITED,
        stock: 50,
        hasOffer: false,
        offerType: null,
        offerValue: null,
        offerStartDate: null,
        offerEndDate: null,
      });
      mockPrisma.product.update.mockResolvedValue({ id: "prod-1" });

      await service.update("prod-1", {
        hasOffer: true,
        offerType: "PERCENTAGE",
        offerValue: 10,
        price: 10,
        stock: 50,
      } as any);

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: new Prisma.Decimal(10),
            offerValue: new Prisma.Decimal(10),
            stock: 50,
          }),
        }),
      );
    });
  });

  describe("remove", () => {
    it("should hard delete a product with no active order references", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: "prod-1",
        availability: ProductAvailability.UNLIMITED,
      });
      mockPrisma.orderItem.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.remove("prod-1");

      expect(result.action).toBe("deleted");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should reject deletion when active orders reference the product", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: "prod-1",
        availability: ProductAvailability.UNLIMITED,
      });
      mockPrisma.orderItem.count.mockResolvedValue(2);

      await expect(service.remove("prod-1")).rejects.toThrow(
        ValidationException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("checkAvailability", () => {
    const baseProduct = {
      id: "p1",
      isActive: true,
      isAvailable: true,
      variants: [{ id: "v1", stock: 3 }],
    };

    it("should return false for UNAVAILABLE products", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...baseProduct,
        availability: ProductAvailability.UNAVAILABLE,
      });

      const result = await service.checkAvailability("p1", 1);
      expect(result).toBe(false);
    });

    it("should ignore stock for UNLIMITED products", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...baseProduct,
        availability: ProductAvailability.UNLIMITED,
      });

      const result = await service.checkAvailability("p1", 1000);
      expect(result).toBe(true);
    });

    it("should enforce stock for LIMITED products", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...baseProduct,
        availability: ProductAvailability.LIMITED,
        stock: 5,
      });

      expect(await service.checkAvailability("p1", 5)).toBe(true);
      expect(await service.checkAvailability("p1", 6)).toBe(false);
    });

    it("should enforce variant stock when variantId is provided", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...baseProduct,
        availability: ProductAvailability.LIMITED,
        stock: 100,
      });

      expect(await service.checkAvailability("p1", 3, "v1")).toBe(true);
      expect(await service.checkAvailability("p1", 4, "v1")).toBe(false);
    });
  });
});
