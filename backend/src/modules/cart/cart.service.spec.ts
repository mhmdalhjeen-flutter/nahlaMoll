import { Test, TestingModule } from "@nestjs/testing";
import { Prisma, ProductAvailability } from "@prisma/client";
import { CartService } from "./cart.service";
import { ProductsService } from "../products/products.service";
import { DeliveryService } from "../delivery/delivery.service";
import { CustomerEventsService } from "../customer-events/customer-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { createMockPrismaService } from "../prisma/prisma.service.mock";
import {
  ResourceNotFoundException,
  ValidationException,
  InsufficientStockException,
} from "../../common/exceptions/business.exception";

const mockPrisma = createMockPrismaService();

describe("CartService", () => {
  let service: CartService;
  let productsService: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        ProductsService,
        {
          provide: DeliveryService,
          useValue: {
            calculateFreeDelivery: jest.fn().mockResolvedValue({
              actualScore: 10,
              displayedScore: 10,
              target: 10,
              progressPercentage: 100,
              remainingScore: 0,
              partialEnabled: true,
              partialThreshold: 7,
              partialDiscount: 50,
              originalDeliveryFee: 0,
              deliveryFee: 0,
              deliveryDiscount: 0,
              isFreeDelivery: false,
              isPartialFreeDelivery: false,
              areaEligibility: null,
            }),
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: CustomerEventsService,
          useValue: { recordInternal: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    productsService = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  function mockProduct(product: any) {
    mockPrisma.product.findFirst.mockResolvedValue(product);
    mockPrisma.product.findUnique.mockResolvedValue(product);
  }

  const baseProduct = {
    id: "prod-1",
    name: "Product",
    price: new Prisma.Decimal(100),
    freeDeliveryValue: new Prisma.Decimal(10),
    isActive: true,
    isAvailable: true,
    variants: [],
  };

  const variantProduct = {
    id: "prod-2",
    name: "Variant Product",
    price: new Prisma.Decimal(100),
    freeDeliveryValue: new Prisma.Decimal(10),
    isActive: true,
    isAvailable: true,
    variants: [
      { id: "var-1", stock: 2, priceAdjustment: new Prisma.Decimal(0) },
    ],
  };

  describe("addToCart", () => {
    it("adds an unlimited product to cart", async () => {
      const product = {
        ...baseProduct,
        availability: ProductAvailability.UNLIMITED,
      };
      mockProduct(product);
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue({
        id: "ci-1",
        userId: "user-1",
        productId: "prod-1",
        quantity: 1,
      });

      const result = await service.addToCart("user-1", "prod-1", 1);

      expect(result.userId).toBe("user-1");
      expect(mockPrisma.cartItem.create).toHaveBeenCalled();
    });

    it("rejects unavailable products", async () => {
      const product = {
        ...baseProduct,
        availability: ProductAvailability.UNAVAILABLE,
      };
      mockProduct(product);

      await expect(service.addToCart("user-1", "prod-1", 1)).rejects.toThrow(
        InsufficientStockException,
      );
    });

    it("rejects limited products when stock is insufficient", async () => {
      const product = {
        ...baseProduct,
        availability: ProductAvailability.LIMITED,
        stock: 2,
      };
      mockProduct(product);

      await expect(service.addToCart("user-1", "prod-1", 3)).rejects.toThrow(
        InsufficientStockException,
      );
    });

    it("rejects product with variants when variantId is missing", async () => {
      mockProduct(variantProduct);

      await expect(service.addToCart("user-1", "prod-2", 1)).rejects.toThrow(
        ValidationException,
      );
    });

    it("rejects invalid variantId for product", async () => {
      mockProduct(variantProduct);

      await expect(
        service.addToCart("user-1", "prod-2", 1, "wrong-var"),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it("updates quantity when item already exists", async () => {
      const product = {
        ...variantProduct,
        availability: ProductAvailability.UNLIMITED,
      };
      mockProduct(product);
      mockPrisma.cartItem.findFirst.mockResolvedValue({
        id: "ci-1",
        quantity: 1,
      });
      mockPrisma.cartItem.update.mockResolvedValue({ id: "ci-1", quantity: 3 });

      const result = await service.addToCart("user-1", "prod-2", 2, "var-1");

      expect(result.quantity).toBe(3);
      expect(mockPrisma.cartItem.update).toHaveBeenCalled();
    });
  });

  describe("customer isolation", () => {
    it("returns only the current user cart items", async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([
        { id: "ci-1", userId: "user-1", quantity: 1, product: baseProduct },
      ]);

      const result = await service.getCart("user-1");

      expect(result.items).toHaveLength(1);
      expect(result.summary).toMatchObject({
        subtotal: 100,
        actualScore: 10,
        displayedScore: 10,
        target: 10,
        progressPercentage: 100,
        remainingScore: 0,
      });
      expect(mockPrisma.cartItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1" } }),
      );
    });

    it("prevents one user from removing another user cart item", async () => {
      mockPrisma.cartItem.findUnique.mockResolvedValue({
        id: "ci-1",
        userId: "user-2",
      });

      await expect(service.removeFromCart("user-1", "ci-1")).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it("clears only the current user cart", async () => {
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });

      await service.clearCart("user-1");

      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });
});
