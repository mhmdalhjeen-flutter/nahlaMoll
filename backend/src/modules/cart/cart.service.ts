import { Injectable } from "@nestjs/common";
import { CustomerInteractionType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "../products/products.service";
import { DeliveryService } from "../delivery/delivery.service";
import { CustomerEventsService } from "../customer-events/customer-events.service";
import { CUSTOMER_EVENT_SOURCES } from "../customer-events/customer-events.constants";
import { calculateProductUnitPrice } from "../../common/utils/product-pricing.util";
import {
  ResourceNotFoundException,
  ValidationException,
  InsufficientStockException,
} from "../../common/exceptions/business.exception";

export interface CartTotals {
  subtotal: number;
  totalItems: number;
  itemCount: number;
}

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private deliveryService: DeliveryService,
    private customerEventsService: CustomerEventsService,
  ) {}

  private get baseInclude() {
    return {
      product: { include: { category: true } },
      variant: true,
    };
  }

  async getCart(userId: string, deliveryAreaId?: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: this.baseInclude,
      orderBy: { createdAt: "asc" as const },
    });

    const [totals, delivery] = await Promise.all([
      Promise.resolve(this.calculateCartTotals(cartItems as any[])),
      this.deliveryService.calculateFreeDelivery(userId, deliveryAreaId),
    ]);

    return { items: cartItems, summary: { ...totals, ...delivery } };
  }

  async getSummary(userId: string, deliveryAreaId?: string) {
    const cart = await this.getCart(userId, deliveryAreaId);
    return cart.summary;
  }

  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ) {
    if (!quantity || quantity < 1) {
      throw new ValidationException("Quantity must be at least 1");
    }

    const product = await this.productsService.findOneActive(productId);
    if (!product) {
      throw new ResourceNotFoundException("Product", productId);
    }

    await this.validateVariantForProduct(product, variantId);

    const isAvailable = await this.productsService.checkAvailability(
      productId,
      quantity,
      variantId,
    );
    if (!isAvailable) {
      throw new InsufficientStockException(product.name, quantity, 0);
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        variantId: variantId ?? null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const availableForNew = await this.productsService.checkAvailability(
        productId,
        newQuantity,
        variantId,
      );
      if (!availableForNew) {
        throw new InsufficientStockException(product.name, newQuantity, 0);
      }

      const updated = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: this.baseInclude,
      });

      this.customerEventsService.recordInternal({
        userId,
        type: CustomerInteractionType.CART_QUANTITY_CHANGED,
        productId,
        metadata: {
          quantity: newQuantity,
          previousQuantity: existingItem.quantity,
          variantId: variantId ?? null,
        },
        source: CUSTOMER_EVENT_SOURCES.SERVER,
      });

      return updated;
    }

    const created = await this.prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity,
        variantId: variantId || null,
      },
      include: this.baseInclude,
    });

    this.customerEventsService.recordInternal({
      userId,
      type: CustomerInteractionType.CART_ITEM_ADDED,
      productId,
      metadata: { quantity, variantId: variantId ?? null },
      source: CUSTOMER_EVENT_SOURCES.SERVER,
    });

    return created;
  }

  async updateCartItem(userId: string, cartItemId: string, quantity: number) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true, variant: true },
    });

    if (!cartItem || cartItem.userId !== userId) {
      throw new ResourceNotFoundException("Cart item", cartItemId);
    }

    if (quantity <= 0) {
      return this.removeFromCart(userId, cartItemId);
    }

    const isAvailable = await this.productsService.checkAvailability(
      cartItem.productId,
      quantity,
      cartItem.variantId || undefined,
    );
    if (!isAvailable) {
      throw new InsufficientStockException(
        cartItem.product.name,
        quantity,
        cartItem.variant?.stock ?? cartItem.product.stock,
      );
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: this.baseInclude,
    });

    this.customerEventsService.recordInternal({
      userId,
      type: CustomerInteractionType.CART_QUANTITY_CHANGED,
      productId: cartItem.productId,
      metadata: {
        quantity,
        previousQuantity: cartItem.quantity,
        variantId: cartItem.variantId,
      },
      source: CUSTOMER_EVENT_SOURCES.SERVER,
    });

    return updated;
  }

  async removeFromCart(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem || cartItem.userId !== userId) {
      throw new ResourceNotFoundException("Cart item", cartItemId);
    }

    const removed = await this.prisma.cartItem.delete({
      where: { id: cartItemId },
      include: this.baseInclude,
    });

    this.customerEventsService.recordInternal({
      userId,
      type: CustomerInteractionType.CART_ITEM_REMOVED,
      productId: cartItem.productId,
      metadata: { variantId: cartItem.variantId },
      source: CUSTOMER_EVENT_SOURCES.SERVER,
    });

    return removed;
  }

  async clearCart(userId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { userId },
    });
  }

  calculateCartTotals(cartItems: any[]): CartTotals {
    let subtotal = new Prisma.Decimal(0);
    let totalItems = 0;

    cartItems.forEach((item) => {
      const { unitPrice } = calculateProductUnitPrice(
        item.product,
        item.variant?.priceAdjustment ?? 0,
      );
      const quantity = item.quantity;

      subtotal = subtotal.plus(new Prisma.Decimal(unitPrice).times(quantity));
      totalItems += quantity;
    });

    return {
      subtotal: subtotal.toDecimalPlaces(2).toNumber(),
      totalItems,
      itemCount: cartItems.length,
    };
  }

  private async validateVariantForProduct(product: any, variantId?: string) {
    const hasVariants = product.variants && product.variants.length > 0;

    if (hasVariants && !variantId) {
      throw new ValidationException(
        "This product requires a variant selection",
      );
    }

    if (variantId) {
      const variant = product.variants.find((v: any) => v.id === variantId);
      if (!variant) {
        throw new ResourceNotFoundException("Product variant", variantId);
      }
    }
  }
}
