import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  ResourceNotFoundException,
  ValidationException,
} from "../../common/exceptions/business.exception";
import {
  toOptionalDecimal,
  toRequiredDecimal,
} from "../../common/utils/decimal.util";
import { CreateProductDto, CreateVariantDto } from "./dtos/create-product.dto";
import { UpdateProductDto } from "./dtos/update-product.dto";
import { ACTIVE_ORDER_STATUSES } from "../orders/order.constants";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private get baseInclude() {
    return {
      category: true,
      variants: true,
    };
  }

  /** Lighter include for product list cards (GET /products, favorites list). */
  getListInclude() {
    return {
      category: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          slug: true,
          parentId: true,
          isActive: true,
        },
      },
      variants: {
        select: {
          id: true,
          name: true,
          value: true,
          type: true,
          priceAdjustment: true,
          stock: true,
        },
      },
    };
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    includeInactive?: boolean;
  }) {
    const { skip, take, where, orderBy, includeInactive } = params;

    const publicWhere = includeInactive
      ? where
      : {
          ...where,
          isActive: true,
          isAvailable: true,
          availability: { not: "UNAVAILABLE" },
        };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take,
        where: publicWhere,
        orderBy,
        include: this.getListInclude(),
      }),
      this.prisma.product.count({ where: publicWhere }),
    ]);

    return {
      products,
      total,
      page: take ? Math.floor(skip / take) + 1 : 1,
      pageSize: take,
    };
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: this.baseInclude,
    });
  }

  async findOneActive(id: string) {
    return this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        isAvailable: true,
        availability: { not: "UNAVAILABLE" },
      },
      include: this.baseInclude,
    });
  }

  async findRecommended() {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        isAvailable: true,
        availability: { not: "UNAVAILABLE" },
        isRecommended: true,
      },
      include: { category: true },
    });
  }

  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: ids },
        isActive: true,
        isAvailable: true,
        availability: { not: "UNAVAILABLE" },
      },
      include: this.baseInclude,
    });
    return this.sortProductsByIdOrder(ids, products);
  }

  sortProductsByIdOrder<T extends { id: string }>(
    ids: string[],
    products: T[],
  ): T[] {
    const map = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id)).filter((p): p is T => !!p);
  }

  async findOffers() {
    const now = new Date();
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        isAvailable: true,
        availability: { not: "UNAVAILABLE" },
        hasOffer: true,
        offerStartDate: { lte: now },
        OR: [{ offerEndDate: null }, { offerEndDate: { gte: now } }],
      },
      include: { category: true },
    });
  }

  /** @deprecated Use ProductSearchService.search — kept for internal compatibility. */
  async search(query: string) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < 2 || normalized.length > 100) {
      throw new ValidationException(
        "Search query must contain between 2 and 100 characters",
      );
    }
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        isAvailable: true,
        availability: { not: "UNAVAILABLE" },
        OR: [
          { name: { contains: normalized, mode: "insensitive" } },
          { nameEn: { contains: normalized, mode: "insensitive" } },
          { description: { contains: normalized, mode: "insensitive" } },
          { tags: { has: normalized } },
        ],
      },
      include: { category: true },
    });
  }

  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new ResourceNotFoundException("Category", dto.categoryId);
    }

    this.validateAvailabilityStock(dto.availability, dto.stock);
    this.validateOffer(dto);

    const data: Prisma.ProductUncheckedCreateInput = {
      name: dto.name,
      nameEn: dto.nameEn,
      description: dto.description,
      descriptionEn: dto.descriptionEn,
      categoryId: dto.categoryId,
      price: toRequiredDecimal(dto.price, "price"),
      freeDeliveryValue: toOptionalDecimal(
        dto.freeDeliveryValue ?? 0,
      ) as Prisma.Decimal,
      freeDeliveryValueSubNear: toOptionalDecimal(
        dto.freeDeliveryValueSubNear ?? 0,
      ) as Prisma.Decimal,
      freeDeliveryValueSubFar: toOptionalDecimal(
        dto.freeDeliveryValueSubFar ?? 0,
      ) as Prisma.Decimal,
      availability: dto.availability,
      stock: dto.stock ?? 0,
      isAvailable: dto.isAvailable ?? true,
      isRecommended: dto.isRecommended ?? false,
      condition: dto.condition,
      tags: dto.tags ?? [],
      images: dto.images ?? [],
      hasOffer: dto.hasOffer ?? false,
      ...(dto.hasOffer
        ? {
            offerType: dto.offerType,
            offerValue:
              dto.offerValue != null
                ? toRequiredDecimal(dto.offerValue, "offerValue")
                : undefined,
            offerStartDate: dto.offerStartDate,
            offerEndDate: dto.offerEndDate,
          }
        : {
            offerType: null,
            offerValue: null,
            offerStartDate: null,
            offerEndDate: null,
          }),
    };

    if (dto.variants?.length) {
      data.variants = {
        create: dto.variants.map((variant) => this.mapVariantInput(variant)),
      };
    }

    return this.prisma.product.create({
      data,
      include: this.baseInclude,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new ResourceNotFoundException("Product", id);
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new ResourceNotFoundException("Category", dto.categoryId);
      }
    }

    const hasOffer = dto.hasOffer ?? existing.hasOffer;

    this.validateAvailabilityStock(
      dto.availability ?? existing.availability,
      dto.stock ?? existing.stock,
    );
    this.validateOffer({
      hasOffer,
      offerType:
        hasOffer === false ? null : (dto.offerType ?? existing.offerType),
      offerValue:
        hasOffer === false
          ? null
          : dto.offerValue !== undefined
            ? dto.offerValue
            : existing.offerValue != null
              ? existing.offerValue.toNumber()
              : null,
      offerStartDate: dto.offerStartDate ?? existing.offerStartDate,
      offerEndDate: dto.offerEndDate ?? existing.offerEndDate,
    });

    const data: Prisma.ProductUncheckedUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.categoryId !== undefined) {
      data.categoryId = dto.categoryId;
    }
    if (dto.price !== undefined) {
      data.price = toRequiredDecimal(dto.price, "price");
    }
    if (dto.freeDeliveryValue !== undefined) {
      data.freeDeliveryValue = toRequiredDecimal(
        dto.freeDeliveryValue,
        "freeDeliveryValue",
      );
    }
    if (dto.freeDeliveryValueSubNear !== undefined) {
      data.freeDeliveryValueSubNear = toRequiredDecimal(
        dto.freeDeliveryValueSubNear,
        "freeDeliveryValueSubNear",
      );
    }
    if (dto.freeDeliveryValueSubFar !== undefined) {
      data.freeDeliveryValueSubFar = toRequiredDecimal(
        dto.freeDeliveryValueSubFar,
        "freeDeliveryValueSubFar",
      );
    }
    if (dto.availability !== undefined) data.availability = dto.availability;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.isAvailable !== undefined) data.isAvailable = dto.isAvailable;
    if (dto.isRecommended !== undefined) data.isRecommended = dto.isRecommended;
    if (dto.condition !== undefined) data.condition = dto.condition;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.images !== undefined) data.images = dto.images;

    if (dto.hasOffer === false) {
      data.hasOffer = false;
      data.offerType = null;
      data.offerValue = null;
      data.offerStartDate = null;
      data.offerEndDate = null;
    } else if (dto.hasOffer === true || hasOffer) {
      if (dto.hasOffer !== undefined) data.hasOffer = dto.hasOffer;
      if (dto.offerType !== undefined) data.offerType = dto.offerType;
      if (dto.offerValue !== undefined) {
        data.offerValue = toRequiredDecimal(dto.offerValue, "offerValue");
      }
      if (dto.offerStartDate !== undefined) {
        data.offerStartDate = dto.offerStartDate;
      }
      if (dto.offerEndDate !== undefined) {
        data.offerEndDate = dto.offerEndDate;
      }
    }

    if (dto.variants !== undefined) {
      data.variants = {
        deleteMany: {},
        create: dto.variants.map((variant) => this.mapVariantInput(variant)),
      };
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: this.baseInclude,
    });
  }

  async deactivate(id: string) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new ResourceNotFoundException("Product", id);
    }

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false, isAvailable: false },
      include: this.baseInclude,
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new ResourceNotFoundException("Product", id);
    }

    const activeOrderItems = await this.prisma.orderItem.count({
      where: {
        productId: id,
        order: { status: { in: ACTIVE_ORDER_STATUSES } },
      },
    });

    if (activeOrderItems > 0) {
      throw new ValidationException(
        "لا يمكن حذف المنتج لأنه مرتبط بطلبات قيد المعالجة",
      );
    }

    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { productId: id } }),
      this.prisma.favorite.deleteMany({ where: { productId: id } }),
      this.prisma.review.deleteMany({ where: { productId: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);

    return {
      action: "deleted" as const,
      reason:
        "Product deleted; historical order snapshots preserved via OrderItem records",
      productId: id,
    };
  }

  async checkAvailability(
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product || !product.isActive || !product.isAvailable) {
      return false;
    }

    if (product.availability === "UNAVAILABLE") {
      return false;
    }

    if (product.availability === "UNLIMITED") {
      return true;
    }

    if (product.availability === "LIMITED") {
      if (variantId) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (!variant) return false;
        return variant.stock >= quantity;
      }
      return product.stock >= quantity;
    }

    return false;
  }

  private validateAvailabilityStock(
    availability: string | undefined,
    stock: number | undefined,
  ) {
    if (availability === "LIMITED" && (stock === undefined || stock < 0)) {
      throw new ValidationException(
        "Limited products must have a stock quantity >= 0",
      );
    }
  }

  private validateOffer(input: {
    hasOffer?: boolean;
    offerType?: unknown;
    offerValue?: number;
    offerStartDate?: Date;
    offerEndDate?: Date;
  }) {
    if (
      input.hasOffer &&
      (input.offerType == null || input.offerValue == null)
    ) {
      throw new ValidationException(
        "Enabled offers require offerType and offerValue",
      );
    }
    if (input.offerValue !== undefined && input.offerValue < 0) {
      throw new ValidationException("Offer value must be non-negative");
    }
    if (
      input.offerStartDate &&
      input.offerEndDate &&
      input.offerEndDate < input.offerStartDate
    ) {
      throw new ValidationException(
        "Offer end date must not be before offer start date",
      );
    }
  }

  private mapVariantInput(variant: CreateVariantDto) {
    return {
      name: variant.name,
      value: variant.value,
      type: variant.type,
      priceAdjustment: toOptionalDecimal(
        variant.priceAdjustment ?? 0,
      ) as Prisma.Decimal,
      stock: variant.stock ?? 0,
    };
  }
}
