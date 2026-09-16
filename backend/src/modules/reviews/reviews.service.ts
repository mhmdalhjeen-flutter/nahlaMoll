import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "../products/products.service";
import { CreateReviewDto } from "./dtos/create-review.dto";
import {
  ResourceNotFoundException,
  ValidationException,
} from "../../common/exceptions/business.exception";

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  async findByProduct(productId: string, page = 1, limit = 20) {
    const pageSize = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * pageSize;
    const where = { productId };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page: Math.max(page, 1), pageSize };
  }

  async findAllAdmin() {
    return this.prisma.review.findMany({
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
        product: { select: { id: true, name: true, images: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findMine(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: { product: { select: { id: true, name: true, images: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.productsService.findOneActive(productId);
    if (!product) {
      throw new ResourceNotFoundException("Product", productId);
    }

    try {
      return await this.prisma.review.create({
        data: {
          userId,
          productId,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ValidationException("You have already reviewed this product");
      }
      throw error;
    }
  }

  async remove(userId: string, productId: string) {
    const review = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!review) {
      throw new ResourceNotFoundException("Review", productId);
    }

    await this.prisma.review.delete({
      where: { userId_productId: { userId, productId } },
    });

    return { removed: true };
  }

  async getProductRatingSummary(productId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      averageRating: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count.rating,
    };
  }
}
