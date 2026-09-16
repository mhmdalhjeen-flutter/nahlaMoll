import { Injectable } from "@nestjs/common";
import {
  CustomerInteractionType,
  DeliveryAreaType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductAvailability,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { DeliveryService } from "../delivery/delivery.service";
import { SettingsService } from "../settings/settings.service";
import { CustomerEventsService } from "../customer-events/customer-events.service";
import { CUSTOMER_EVENT_SOURCES } from "../customer-events/customer-events.constants";
import { CreateOrderDto } from "./dtos/create-order.dto";
import { UpdateOrderStatusDto } from "./dtos/update-order-status.dto";
import { SubmitPaymentDto } from "./dtos/submit-payment.dto";
import { AdminPaymentActionDto } from "./dtos/admin-payment-action.dto";
import {
  InsufficientStockException,
  ResourceNotFoundException,
  StoreClosedException,
  ValidationException,
} from "../../common/exceptions/business.exception";
import { calculateProductUnitPrice } from "../../common/utils/product-pricing.util";
import {
  canAdminCancelOrder,
  canCustomerCancelOrder,
  canDeleteOrder,
  isCashOnDeliveryOrder,
} from "./order.constants";
import { resolveFreeDeliveryContribution } from "../../common/utils/product-free-delivery.util";

type CartItemWithRelations = Prisma.CartItemGetPayload<{
  include: {
    product: { include: { variants: true } };
    variant: true;
  };
}>;

const orderInclude = {
  items: true,
  deliveryArea: true,
  customer: {
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      email: true,
    },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private deliveryService: DeliveryService,
    private settingsService: SettingsService,
    private customerEventsService: CustomerEventsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const storeStatus = await this.settingsService.getStoreStatus();
    if (!storeStatus.isOpen) {
      throw new StoreClosedException(
        storeStatus.message || "المتجر مغلق حالياً",
      );
    }

    const area = await this.deliveryService.getActiveAreaById(
      dto.deliveryAreaId,
    );
    if (!area) {
      throw new ResourceNotFoundException("Delivery area", dto.deliveryAreaId);
    }

    if (!dto.deliveryAddress?.trim()) {
      throw new ValidationException("Delivery address is required");
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: {
          product: { include: { variants: true } },
          variant: true,
        },
        orderBy: { createdAt: "asc" },
      });

      if (cartItems.length === 0) {
        throw new ValidationException("Cart is empty");
      }

      for (const item of cartItems) {
        this.assertPurchasable(item);
      }

      for (const item of cartItems) {
        await this.deductStock(tx, item);
      }

      const totals = this.cartService.calculateCartTotals(cartItems);
      const deliverySettings = await this.settingsService.getDeliverySettings();
      const score = cartItems.reduce(
        (sum, item) =>
          sum.plus(
            resolveFreeDeliveryContribution(item.product, area.areaType).times(
              item.quantity,
            ),
          ),
        new Prisma.Decimal(0),
      );
      const delivery = this.deliveryService.calculateScoreResult(
        score,
        deliverySettings,
        area,
      );

      const subtotal = new Prisma.Decimal(totals.subtotal);
      const deliveryFee = new Prisma.Decimal(delivery.deliveryFee);
      const total = subtotal.plus(deliveryFee);
      const orderNumber = await this.generateOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: userId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          deliveryFee,
          total,
          cartScore: new Prisma.Decimal(delivery.actualScore),
          deliveryAreaId: dto.deliveryAreaId,
          deliveryAddress: dto.deliveryAddress.trim(),
          notes: dto.notes?.trim() || null,
          items: {
            create: cartItems.map((item) =>
              this.buildOrderItemSnapshot(item, area.areaType),
            ),
          },
        },
        include: orderInclude,
      });

      await tx.cartItem.deleteMany({ where: { userId } });

      return order;
    });

    this.customerEventsService.recordInternal({
      userId,
      type: CustomerInteractionType.ORDER_CREATED,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        productIds: order.items.map((item) => item.productId).filter(Boolean),
      },
      source: CUSTOMER_EVENT_SOURCES.SERVER,
    });

    return order;
  }

  async findAllForCustomer(userId: string, page = 1, limit = 50) {
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * pageSize;
    const where = { customerId: userId };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          deliveryArea: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page: Math.max(page, 1), pageSize };
  }

  async findOneForCustomer(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: orderInclude,
    });

    if (!order) {
      throw new ResourceNotFoundException("Order", orderId);
    }

    return order;
  }

  async findAllAdmin(page = 1, limit = 50) {
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.order.count(),
    ]);

    return { items, total, page: Math.max(page, 1), pageSize };
  }

  async findOneAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });

    if (!order) {
      throw new ResourceNotFoundException("Order", orderId);
    }

    return order;
  }

  async updateStatusAdmin(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOneAdmin(orderId);

    if (
      dto.status === OrderStatus.CANCELLED &&
      !canAdminCancelOrder(order.status)
    ) {
      throw new ValidationException("لا يمكن إلغاء هذا الطلب في حالته الحالية");
    }

    const data: Prisma.OrderUpdateInput = {
      status: dto.status,
      adminPaymentNotes: dto.adminNotes?.trim() || undefined,
    };

    if (
      dto.status === OrderStatus.DELIVERED &&
      isCashOnDeliveryOrder(order) &&
      order.paymentStatus === PaymentStatus.PENDING
    ) {
      data.paymentStatus = PaymentStatus.VERIFIED;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data,
      include: orderInclude,
    });

    if (dto.status === OrderStatus.DELIVERED) {
      this.customerEventsService.recordInternal({
        userId: updated.customerId,
        type: CustomerInteractionType.ORDER_COMPLETED,
        metadata: {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
        },
        source: CUSTOMER_EVENT_SOURCES.SERVER,
      });
    }

    if (dto.status === OrderStatus.CANCELLED) {
      this.customerEventsService.recordInternal({
        userId: updated.customerId,
        type: CustomerInteractionType.ORDER_CANCELLED,
        metadata: {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          cancelledBy: "admin",
        },
        source: CUSTOMER_EVENT_SOURCES.SERVER,
      });
    }

    return updated;
  }

  async cancelForCustomer(userId: string, orderId: string) {
    const order = await this.findOneForCustomer(userId, orderId);

    if (!canCustomerCancelOrder(order.status)) {
      throw new ValidationException("لا يمكن إلغاء هذا الطلب في حالته الحالية");
    }

    const cancelled = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: orderInclude,
    });

    this.customerEventsService.recordInternal({
      userId,
      type: CustomerInteractionType.ORDER_CANCELLED,
      metadata: {
        orderId: cancelled.id,
        orderNumber: cancelled.orderNumber,
      },
      source: CUSTOMER_EVENT_SOURCES.SERVER,
    });

    return cancelled;
  }

  async deleteForCustomer(userId: string, orderId: string) {
    const order = await this.findOneForCustomer(userId, orderId);

    if (!canDeleteOrder(order.status)) {
      throw new ValidationException(
        "يمكن حذف الطلبات المُسلّمة أو الملغاة فقط",
      );
    }

    await this.prisma.order.delete({ where: { id: orderId } });
    return { deleted: true, orderId };
  }

  async deleteAdmin(orderId: string) {
    const order = await this.findOneAdmin(orderId);

    if (!canDeleteOrder(order.status)) {
      throw new ValidationException(
        "يمكن حذف الطلبات المُسلّمة أو الملغاة فقط",
      );
    }

    await this.prisma.order.delete({ where: { id: orderId } });
    return { deleted: true, orderId };
  }

  async submitPayment(userId: string, orderId: string, dto: SubmitPaymentDto) {
    const order = await this.findOneForCustomer(userId, orderId);

    const canSubmit =
      order.status === OrderStatus.PENDING &&
      order.paymentStatus === PaymentStatus.PENDING;

    const canResubmit =
      order.status === OrderStatus.PAYMENT_REJECTED &&
      order.paymentStatus === PaymentStatus.REJECTED;

    if (!canSubmit && !canResubmit) {
      throw new ValidationException(
        "Payment cannot be submitted for this order in its current state",
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAYMENT_SUBMITTED,
        paymentStatus: PaymentStatus.SUBMITTED,
        paymentReference: dto.paymentReference.trim(),
        paymentNotes: dto.paymentNotes?.trim() || null,
        paymentProof: dto.paymentProof?.trim() || null,
      },
      include: orderInclude,
    });
  }

  async verifyPaymentAdmin(orderId: string, dto: AdminPaymentActionDto) {
    const order = await this.findOneAdmin(orderId);

    if (
      order.status !== OrderStatus.PAYMENT_SUBMITTED ||
      order.paymentStatus !== PaymentStatus.SUBMITTED
    ) {
      throw new ValidationException("Only submitted payments can be verified");
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.VERIFIED,
        adminPaymentNotes: dto.adminPaymentNotes?.trim() || null,
      },
      include: orderInclude,
    });
  }

  async rejectPaymentAdmin(orderId: string, dto: AdminPaymentActionDto) {
    const order = await this.findOneAdmin(orderId);

    if (
      order.status !== OrderStatus.PAYMENT_SUBMITTED ||
      order.paymentStatus !== PaymentStatus.SUBMITTED
    ) {
      throw new ValidationException("Only submitted payments can be rejected");
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAYMENT_REJECTED,
        paymentStatus: PaymentStatus.REJECTED,
        adminPaymentNotes: dto.adminPaymentNotes?.trim() || null,
      },
      include: orderInclude,
    });
  }

  private assertPurchasable(item: CartItemWithRelations) {
    const product = item.product;

    if (!product.isActive || !product.isAvailable) {
      throw new ValidationException(
        `Product '${product.name}' is no longer available`,
      );
    }

    if (product.availability === ProductAvailability.UNAVAILABLE) {
      throw new ValidationException(
        `Product '${product.name}' cannot be purchased`,
      );
    }

    const hasVariants = product.variants.length > 0;
    if (hasVariants && !item.variantId) {
      throw new ValidationException(
        `Product '${product.name}' requires a variant selection`,
      );
    }

    if (item.variantId && !item.variant) {
      throw new ResourceNotFoundException("Product variant", item.variantId);
    }
  }

  private async deductStock(
    tx: Prisma.TransactionClient,
    item: CartItemWithRelations,
  ) {
    const product = item.product;

    if (product.availability === ProductAvailability.UNLIMITED) {
      return;
    }

    if (product.availability !== ProductAvailability.LIMITED) {
      throw new ValidationException(
        `Product '${product.name}' cannot be purchased`,
      );
    }

    if (item.variantId) {
      const updated = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          productId: product.id,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (updated.count === 0) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });
        throw new InsufficientStockException(
          product.name,
          item.quantity,
          variant?.stock ?? 0,
        );
      }
      return;
    }

    const updated = await tx.product.updateMany({
      where: {
        id: product.id,
        availability: ProductAvailability.LIMITED,
        isActive: true,
        isAvailable: true,
        stock: { gte: item.quantity },
      },
      data: { stock: { decrement: item.quantity } },
    });

    if (updated.count === 0) {
      const fresh = await tx.product.findUnique({ where: { id: product.id } });
      throw new InsufficientStockException(
        product.name,
        item.quantity,
        fresh?.stock ?? 0,
      );
    }
  }

  buildOrderItemSnapshot(
    item: CartItemWithRelations,
    areaType: DeliveryAreaType = DeliveryAreaType.MAIN,
  ): Prisma.OrderItemCreateWithoutOrderInput {
    const { unitPrice } = calculateProductUnitPrice(
      item.product,
      item.variant?.priceAdjustment ?? 0,
    );

    return {
      product: { connect: { id: item.productId } },
      productName: item.product.name,
      quantity: item.quantity,
      price: new Prisma.Decimal(unitPrice),
      freeDeliveryValue: resolveFreeDeliveryContribution(
        item.product,
        areaType,
      ),
      variantInfo: item.variant
        ? JSON.stringify({
            id: item.variant.id,
            name: item.variant.name,
            value: item.variant.value,
            type: item.variant.type,
            priceAdjustment: item.variant.priceAdjustment.toString(),
          })
        : null,
    };
  }

  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ nextval: bigint }>>`
      SELECT nextval('"Order_number_seq"') AS nextval
    `;
    return String(rows[0].nextval);
  }
}
