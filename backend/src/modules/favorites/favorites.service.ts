import { Injectable } from "@nestjs/common";
import { CustomerInteractionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "../products/products.service";
import { CustomerEventsService } from "../customer-events/customer-events.service";
import { CUSTOMER_EVENT_SOURCES } from "../customer-events/customer-events.constants";
import { ResourceNotFoundException } from "../../common/exceptions/business.exception";

@Injectable()
export class FavoritesService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private customerEventsService: CustomerEventsService,
  ) {}

  async findAll(userId: string, page = 1, limit = 50) {
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * pageSize;
    const where = { userId };

    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        include: {
          product: {
            include: this.productsService.getListInclude(),
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return { items, total, page: Math.max(page, 1), pageSize };
  }

  async add(userId: string, productId: string) {
    const product = await this.productsService.findOneActive(productId);
    if (!product) {
      throw new ResourceNotFoundException("Product", productId);
    }

    const favorite = await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
      include: { product: true },
    });

    this.customerEventsService.recordInternal({
      userId,
      type: CustomerInteractionType.FAVORITE_ADDED,
      productId,
      source: CUSTOMER_EVENT_SOURCES.SERVER,
    });

    return favorite;
  }

  async remove(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!favorite) {
      throw new ResourceNotFoundException("Favorite", productId);
    }

    await this.prisma.favorite.delete({
      where: { userId_productId: { userId, productId } },
    });

    this.customerEventsService.recordInternal({
      userId,
      type: CustomerInteractionType.FAVORITE_REMOVED,
      productId,
      source: CUSTOMER_EVENT_SOURCES.SERVER,
    });

    return { removed: true };
  }

  async isFavorite(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { isFavorite: !!favorite };
  }
}
