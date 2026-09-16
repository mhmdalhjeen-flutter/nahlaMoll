import { Test, TestingModule } from "@nestjs/testing";
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductAvailability,
} from "@prisma/client";
import { OrdersService } from "./orders.service";
import { CartService } from "../cart/cart.service";
import { DeliveryService } from "../delivery/delivery.service";
import { SettingsService } from "../settings/settings.service";
import { CustomerEventsService } from "../customer-events/customer-events.service";
import { ProductsService } from "../products/products.service";
import { PrismaService } from "../prisma/prisma.service";
import { createMockPrismaService } from "../prisma/prisma.service.mock";
import {
  InsufficientStockException,
  ResourceNotFoundException,
  StoreClosedException,
  ValidationException,
} from "../../common/exceptions/business.exception";

const mockPrisma = createMockPrismaService();

describe("OrdersService", () => {
  let service: OrdersService;
  let deliveryService: DeliveryService;

  const userId = "user-1";
  const areaId = "area-1";

  const deliveryArea = {
    id: areaId,
    name: "رفديا",
    deliveryFee: new Prisma.Decimal(15),
    eligibleForFreeDelivery: true,
    isActive: true,
  };

  const deliverySettings = {
    freeDeliveryTarget: new Prisma.Decimal(10),
    partialFreeDeliveryEnabled: true,
    partialFreeDeliveryThreshold: new Prisma.Decimal(5),
    partialFreeDeliveryDiscount: 50,
  };

  const limitedProduct = {
    id: "prod-1",
    name: "منتج محدود",
    price: new Prisma.Decimal(100),
    freeDeliveryValue: new Prisma.Decimal(5),
    availability: ProductAvailability.LIMITED,
    stock: 10,
    isActive: true,
    isAvailable: true,
    variants: [],
  };

  const unlimitedProduct = {
    id: "prod-2",
    name: "منتج غير محدود",
    price: new Prisma.Decimal(50),
    freeDeliveryValue: new Prisma.Decimal(2),
    availability: ProductAvailability.UNLIMITED,
    stock: 0,
    isActive: true,
    isAvailable: true,
    variants: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        CartService,
        ProductsService,
        {
          provide: DeliveryService,
          useValue: {
            getActiveAreaById: jest.fn(),
            calculateScoreResult: jest.fn(),
            calculateFreeDelivery: jest.fn(),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            getStoreStatus: jest
              .fn()
              .mockResolvedValue({ isOpen: true, message: null }),
            getDeliverySettings: jest.fn().mockResolvedValue(deliverySettings),
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: CustomerEventsService,
          useValue: { recordInternal: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    deliveryService = module.get<DeliveryService>(DeliveryService);

    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback(mockPrisma),
    );
  });

  function mockCart(items: any[]) {
    mockPrisma.cartItem.findMany.mockResolvedValue(items);
  }

  function setupDeliveryMocks(score = 10, deliveryFee = 0) {
    (deliveryService.getActiveAreaById as jest.Mock).mockResolvedValue(
      deliveryArea,
    );
    (deliveryService.calculateScoreResult as jest.Mock).mockReturnValue({
      actualScore: score,
      displayedScore: Math.min(score, 10),
      target: 10,
      progressPercentage: 100,
      partialEnabled: true,
      partialThreshold: 5,
      partialDiscount: 50,
      originalDeliveryFee: 15,
      deliveryFee,
      deliveryDiscount: 15 - deliveryFee,
      isFreeDelivery: deliveryFee === 0,
      isPartialFreeDelivery: deliveryFee > 0 && deliveryFee < 15,
      areaEligibility: true,
      remainingScore: 0,
    });
  }

  describe("create", () => {
    it("rejects checkout when store is closed", async () => {
      const settingsService = service["settingsService"] as SettingsService;
      (settingsService.getStoreStatus as jest.Mock).mockResolvedValue({
        isOpen: false,
        message: "المتجر مغلق",
      });

      await expect(
        service.create(userId, {
          deliveryAreaId: areaId,
          deliveryAddress: "شارع الرئيسي",
        }),
      ).rejects.toThrow(StoreClosedException);
    });

    it("rejects checkout with empty cart", async () => {
      setupDeliveryMocks();
      mockCart([]);

      await expect(
        service.create(userId, {
          deliveryAreaId: areaId,
          deliveryAddress: "شارع الرئيسي",
        }),
      ).rejects.toThrow(ValidationException);
    });

    it("rejects invalid delivery area", async () => {
      (deliveryService.getActiveAreaById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(userId, {
          deliveryAreaId: "missing",
          deliveryAddress: "شارع الرئيسي",
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it("creates order with snapshots and clears cart", async () => {
      setupDeliveryMocks(10, 0);
      mockCart([
        {
          id: "cart-1",
          userId,
          productId: limitedProduct.id,
          quantity: 2,
          variantId: null,
          product: limitedProduct,
          variant: null,
        },
        {
          id: "cart-2",
          userId,
          productId: unlimitedProduct.id,
          quantity: 1,
          variantId: null,
          product: unlimitedProduct,
          variant: null,
        },
      ]);

      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: "order-1",
          ...data,
          items: data.items.create.map((item: any, index: number) => ({
            id: `item-${index}`,
            ...item,
          })),
          deliveryArea,
          customer: { id: userId },
        }),
      );
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.create(userId, {
        deliveryAreaId: areaId,
        deliveryAddress: "  شارع الرئيسي  ",
        notes: "اتصل قبل التوصيل",
      });

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(result.subtotal).toEqual(new Prisma.Decimal(250));
      expect(result.deliveryFee).toEqual(new Prisma.Decimal(0));
      expect(result.total).toEqual(new Prisma.Decimal(250));
      expect(result.deliveryAddress).toBe("شارع الرئيسي");
      expect(result.orderNumber).toBe("10001");

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: limitedProduct.id,
          availability: ProductAvailability.LIMITED,
          isActive: true,
          isAvailable: true,
          stock: { gte: 2 },
        },
        data: { stock: { decrement: 2 } },
      });

      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderNumber: "10001",
            customerId: userId,
            items: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  productName: limitedProduct.name,
                  quantity: 2,
                  price: new Prisma.Decimal(100),
                  freeDeliveryValue: new Prisma.Decimal(5),
                }),
                expect.objectContaining({
                  productName: unlimitedProduct.name,
                  quantity: 1,
                  price: new Prisma.Decimal(50),
                }),
              ]),
            },
          }),
        }),
      );

      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it("rejects when limited stock is insufficient (concurrent protection)", async () => {
      setupDeliveryMocks();
      mockCart([
        {
          id: "cart-1",
          userId,
          productId: limitedProduct.id,
          quantity: 5,
          variantId: null,
          product: limitedProduct,
          variant: null,
        },
      ]);

      mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.product.findUnique.mockResolvedValue({
        ...limitedProduct,
        stock: 2,
      });

      await expect(
        service.create(userId, {
          deliveryAreaId: areaId,
          deliveryAddress: "شارع الرئيسي",
        }),
      ).rejects.toThrow(InsufficientStockException);

      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    it("deducts variant stock for limited variant products", async () => {
      setupDeliveryMocks(5, 7.5);
      const variant = {
        id: "var-1",
        name: "أحمر",
        value: "#FF0000",
        type: "color",
        priceAdjustment: new Prisma.Decimal(10),
        stock: 3,
      };
      const variantProduct = {
        ...limitedProduct,
        id: "prod-3",
        variants: [variant],
      };

      mockCart([
        {
          id: "cart-1",
          userId,
          productId: variantProduct.id,
          quantity: 2,
          variantId: variant.id,
          product: variantProduct,
          variant,
        },
      ]);

      mockPrisma.productVariant.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "order-2", ...data, items: [], deliveryArea }),
      );

      await service.create(userId, {
        deliveryAreaId: areaId,
        deliveryAddress: "شارع الرئيسي",
      });

      expect(mockPrisma.productVariant.updateMany).toHaveBeenCalledWith({
        where: {
          id: variant.id,
          productId: variantProduct.id,
          stock: { gte: 2 },
        },
        data: { stock: { decrement: 2 } },
      });

      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: [
                expect.objectContaining({
                  price: new Prisma.Decimal(110),
                  variantInfo: expect.stringContaining('"name":"أحمر"'),
                }),
              ],
            },
          }),
        }),
      );
    });
  });

  describe("generateOrderNumber", () => {
    it("uses database sequence for simple numeric order numbers", async () => {
      setupDeliveryMocks(10, 0);
      mockCart([
        {
          id: "cart-1",
          userId,
          productId: unlimitedProduct.id,
          quantity: 1,
          variantId: null,
          product: unlimitedProduct,
          variant: null,
        },
      ]);
      mockPrisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "order-seq", ...data, items: [], deliveryArea }),
      );

      await service.create(userId, {
        deliveryAreaId: areaId,
        deliveryAddress: "شارع الرئيسي",
      });

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderNumber: "10001" }),
        }),
      );
    });
  });

  describe("buildOrderItemSnapshot", () => {
    it("preserves historical price even if product price changes later", () => {
      const snapshot = service.buildOrderItemSnapshot({
        productId: limitedProduct.id,
        quantity: 1,
        product: limitedProduct,
        variant: null,
      } as any);

      expect(snapshot.productName).toBe(limitedProduct.name);
      expect(snapshot.price).toEqual(new Prisma.Decimal(100));
      expect(snapshot.freeDeliveryValue).toEqual(new Prisma.Decimal(5));
    });
  });

  describe("findOneForCustomer", () => {
    it("returns order for owner only", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "order-1",
        customerId: userId,
      });

      const result = await service.findOneForCustomer(userId, "order-1");
      expect(result.id).toBe("order-1");
    });

    it("throws when order not owned by customer", async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneForCustomer(userId, "missing"),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe("payment workflow", () => {
    const pendingOrder = {
      id: "order-1",
      customerId: userId,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    };

    it("submits payment from pending state", async () => {
      mockPrisma.order.findFirst.mockResolvedValue(pendingOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAYMENT_SUBMITTED,
        paymentStatus: PaymentStatus.SUBMITTED,
        paymentReference: "REF-123",
      });

      const result = await service.submitPayment(userId, "order-1", {
        paymentReference: "REF-123",
        paymentNotes: "تحويل بنكي",
      });

      expect(result.status).toBe(OrderStatus.PAYMENT_SUBMITTED);
      expect(result.paymentStatus).toBe(PaymentStatus.SUBMITTED);
    });

    it("allows resubmit after rejection", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAYMENT_REJECTED,
        paymentStatus: PaymentStatus.REJECTED,
      });
      mockPrisma.order.update.mockResolvedValue({
        status: OrderStatus.PAYMENT_SUBMITTED,
        paymentStatus: PaymentStatus.SUBMITTED,
      });

      await service.submitPayment(userId, "order-1", {
        paymentReference: "REF-456",
      });

      expect(mockPrisma.order.update).toHaveBeenCalled();
    });

    it("admin verify confirms order", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        status: OrderStatus.PAYMENT_SUBMITTED,
        paymentStatus: PaymentStatus.SUBMITTED,
      });
      mockPrisma.order.update.mockResolvedValue({
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.VERIFIED,
      });

      const result = await service.verifyPaymentAdmin("order-1", {
        adminPaymentNotes: "تم التحقق",
      });

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.paymentStatus).toBe(PaymentStatus.VERIFIED);
    });

    it("admin reject moves order to rejected state", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        status: OrderStatus.PAYMENT_SUBMITTED,
        paymentStatus: PaymentStatus.SUBMITTED,
      });
      mockPrisma.order.update.mockResolvedValue({
        status: OrderStatus.PAYMENT_REJECTED,
        paymentStatus: PaymentStatus.REJECTED,
      });

      const result = await service.rejectPaymentAdmin("order-1", {
        adminPaymentNotes: "مرجع غير صحيح",
      });

      expect(result.status).toBe(OrderStatus.PAYMENT_REJECTED);
      expect(result.paymentStatus).toBe(PaymentStatus.REJECTED);
    });

    it("rejects verify when payment not submitted", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      });

      await expect(service.verifyPaymentAdmin("order-1", {})).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe("cancel and delete", () => {
    it("customer can cancel a pending order", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "order-1",
        customerId: userId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentReference: null,
      });
      mockPrisma.order.update.mockResolvedValue({
        id: "order-1",
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancelForCustomer(userId, "order-1");
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it("customer cannot cancel a shipped order", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "order-1",
        customerId: userId,
        status: OrderStatus.SHIPPED,
      });

      await expect(
        service.cancelForCustomer(userId, "order-1"),
      ).rejects.toThrow(ValidationException);
    });

    it("customer can delete a delivered order", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "order-1",
        customerId: userId,
        status: OrderStatus.DELIVERED,
      });
      mockPrisma.order.delete.mockResolvedValue({ id: "order-1" });

      const result = await service.deleteForCustomer(userId, "order-1");
      expect(result.deleted).toBe(true);
    });
  });

  describe("updateStatusAdmin", () => {
    it("marks COD payment verified when delivered", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        status: OrderStatus.SHIPPED,
        paymentStatus: PaymentStatus.PENDING,
        paymentReference: null,
      });
      mockPrisma.order.update.mockResolvedValue({
        id: "order-1",
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.VERIFIED,
      });

      const result = await service.updateStatusAdmin("order-1", {
        status: OrderStatus.DELIVERED,
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED,
            paymentStatus: PaymentStatus.VERIFIED,
          }),
        }),
      );
      expect(result.paymentStatus).toBe(PaymentStatus.VERIFIED);
    });

    it("does not auto-verify electronic payment on deliver", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "order-1",
        status: OrderStatus.SHIPPED,
        paymentStatus: PaymentStatus.SUBMITTED,
        paymentReference: "Ahmed",
      });
      mockPrisma.order.update.mockResolvedValue({
        id: "order-1",
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.SUBMITTED,
      });

      await service.updateStatusAdmin("order-1", {
        status: OrderStatus.DELIVERED,
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.DELIVERED,
          }),
        }),
      );
      const updateCall = mockPrisma.order.update.mock.calls[0][0];
      expect(updateCall.data.paymentStatus).toBeUndefined();
    });
  });
});
