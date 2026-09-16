import { Injectable } from "@nestjs/common";
import { DeliveryAreaType, DeliveryRegion, Prisma } from "@prisma/client";
import { DELIVERY_REGIONS } from "./delivery-regions.constants";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import {
  ResourceNotFoundException,
  ValidationException,
} from "../../common/exceptions/business.exception";
import { CreateDeliveryAreaDto } from "./dtos/create-delivery-area.dto";
import { UpdateDeliveryAreaDto } from "./dtos/update-delivery-area.dto";
import { resolveFreeDeliveryContribution } from "../../common/utils/product-free-delivery.util";
import {
  FREE_DELIVERY_ELIGIBILITY_THRESHOLD,
  FREE_DELIVERY_PROGRESS_TARGET,
} from "./delivery.constants";

export interface FreeDeliveryCalculation {
  actualScore: number;
  displayedScore: number;
  target: number;
  progressPercentage: number;
  partialEnabled: boolean;
  partialThreshold: number;
  partialDiscount: number;
  originalDeliveryFee: number;
  deliveryFee: number;
  deliveryDiscount: number;
  isFreeDelivery: boolean;
  isPartialFreeDelivery: boolean;
  areaEligibility: boolean | null;
  remainingScore: number;
}

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async getActiveAreas() {
    return this.prisma.deliveryArea.findMany({
      where: { isActive: true },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });
  }

  async getAllAreas() {
    return this.prisma.deliveryArea.findMany({
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });
  }

  async getAreaById(id: string) {
    return this.prisma.deliveryArea.findUnique({ where: { id } });
  }

  async getActiveAreaById(id: string) {
    return this.prisma.deliveryArea.findFirst({
      where: { id, isActive: true },
    });
  }

  getGeographicRegions() {
    return DELIVERY_REGIONS;
  }

  async create(dto: CreateDeliveryAreaDto) {
    const areaType = dto.areaType ?? DeliveryAreaType.MAIN;
    await this.validateAreaHierarchy(
      areaType,
      dto.parentId,
      undefined,
      dto.region,
    );

    return this.prisma.deliveryArea.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        deliveryFee: new Prisma.Decimal(dto.deliveryFee),
        eligibleForFreeDelivery: dto.eligibleForFreeDelivery ?? true,
        isActive: dto.isActive ?? true,
        areaType,
        region:
          areaType === DeliveryAreaType.MAIN ? (dto.region ?? null) : null,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateDeliveryAreaDto) {
    const existing = await this.requireArea(id);
    const nextType = dto.areaType ?? existing.areaType;
    const nextParentId =
      dto.parentId !== undefined ? dto.parentId : existing.parentId;

    const nextRegion = dto.region !== undefined ? dto.region : existing.region;

    await this.validateAreaHierarchy(nextType, nextParentId, id, nextRegion);

    const data: Prisma.DeliveryAreaUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.deliveryFee !== undefined)
      data.deliveryFee = new Prisma.Decimal(dto.deliveryFee);
    if (dto.eligibleForFreeDelivery !== undefined)
      data.eligibleForFreeDelivery = dto.eligibleForFreeDelivery;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.areaType !== undefined) data.areaType = dto.areaType;
    if (dto.parentId !== undefined) {
      data.parent = dto.parentId
        ? { connect: { id: dto.parentId } }
        : { disconnect: true };
    }
    if (dto.region !== undefined || nextType === DeliveryAreaType.MAIN) {
      data.region =
        nextType === DeliveryAreaType.MAIN ? (nextRegion ?? null) : null;
    }
    return this.prisma.deliveryArea.update({ where: { id }, data });
  }

  async setActive(id: string, isActive: boolean) {
    await this.requireArea(id);
    return this.prisma.deliveryArea.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string) {
    await this.requireArea(id);
    const [addressCount, orderCount] = await Promise.all([
      this.prisma.address.count({ where: { deliveryAreaId: id } }),
      this.prisma.order.count({ where: { deliveryAreaId: id } }),
    ]);
    if (addressCount > 0 || orderCount > 0) {
      const area = await this.setActive(id, false);
      return {
        action: "deactivated",
        reason: "Delivery area is referenced and cannot be hard-deleted",
        area,
      };
    }
    await this.prisma.deliveryArea.delete({ where: { id } });
    return {
      action: "deleted",
      reason: "No references found; delivery area hard-deleted",
      areaId: id,
    };
  }

  /**
   * Percentage-based free delivery engine.
   * rawProgress = scoreInput (sum of contribution% × quantity)
   * displayProgress = min(rawProgress, 100)
   * free delivery when rawProgress >= 95 and area is eligible
   */
  calculateScoreResult(
    scoreInput: Prisma.Decimal | number | string,
    _settings?: unknown,
    area?: {
      deliveryFee: Prisma.Decimal | number | string;
      eligibleForFreeDelivery: boolean;
    },
  ): FreeDeliveryCalculation {
    const rawProgress = new Prisma.Decimal(scoreInput);
    const target = new Prisma.Decimal(FREE_DELIVERY_PROGRESS_TARGET);
    const eligibilityThreshold = new Prisma.Decimal(
      FREE_DELIVERY_ELIGIBILITY_THRESHOLD,
    );
    const originalFee = area
      ? new Prisma.Decimal(area.deliveryFee)
      : new Prisma.Decimal(0);

    const displayedProgress = Prisma.Decimal.min(rawProgress, target);
    const progressPercentage = Prisma.Decimal.min(
      100,
      rawProgress,
    ).toDecimalPlaces(2);
    const remainingScore = Prisma.Decimal.max(
      0,
      target.minus(rawProgress),
    ).toDecimalPlaces(2);

    let fee = originalFee;
    let discount = new Prisma.Decimal(0);
    let isFree = false;

    if (
      area?.eligibleForFreeDelivery &&
      rawProgress.greaterThanOrEqualTo(eligibilityThreshold)
    ) {
      isFree = true;
      discount = originalFee;
      fee = new Prisma.Decimal(0);
    }

    return {
      actualScore: rawProgress.toDecimalPlaces(2).toNumber(),
      displayedScore: displayedProgress.toDecimalPlaces(2).toNumber(),
      target: FREE_DELIVERY_PROGRESS_TARGET,
      progressPercentage: progressPercentage.toNumber(),
      partialEnabled: false,
      partialThreshold: 0,
      partialDiscount: 0,
      originalDeliveryFee: originalFee.toNumber(),
      deliveryFee: fee.toDecimalPlaces(2).toNumber(),
      deliveryDiscount: discount.toDecimalPlaces(2).toNumber(),
      isFreeDelivery: isFree,
      isPartialFreeDelivery: false,
      areaEligibility: area ? area.eligibleForFreeDelivery : null,
      remainingScore: remainingScore.toNumber(),
    };
  }

  /** Authenticated API path: score is always derived from this user's DB cart. */
  async calculateFreeDelivery(userId: string, deliveryAreaId?: string) {
    const [cartItems, area] = await Promise.all([
      this.prisma.cartItem.findMany({
        where: { userId },
        include: { product: true },
      }),
      deliveryAreaId
        ? this.getActiveAreaById(deliveryAreaId)
        : Promise.resolve(undefined),
    ]);
    if (deliveryAreaId && !area)
      throw new ResourceNotFoundException("Delivery area", deliveryAreaId);

    const score = cartItems.reduce(
      (sum, item) =>
        sum.plus(
          resolveFreeDeliveryContribution(
            item.product,
            area?.areaType ?? DeliveryAreaType.MAIN,
          ).times(item.quantity),
        ),
      new Prisma.Decimal(0),
    );
    return this.calculateScoreResult(score, undefined, area);
  }

  private async validateAreaHierarchy(
    areaType: DeliveryAreaType,
    parentId?: string | null,
    editingId?: string,
    region?: DeliveryRegion | null,
  ) {
    if (areaType === DeliveryAreaType.MAIN) {
      if (parentId) {
        throw new ValidationException("Main areas cannot have a parent");
      }
      if (region != null && !DELIVERY_REGIONS.includes(region)) {
        throw new ValidationException("Invalid geographic region");
      }
      return;
    }

    if (!parentId) {
      throw new ValidationException("Sub-areas must belong to a main area");
    }

    const parent = await this.getAreaById(parentId);
    if (!parent || parent.areaType !== DeliveryAreaType.MAIN) {
      throw new ValidationException("Parent must be an active main area");
    }

    if (editingId && parentId === editingId) {
      throw new ValidationException("An area cannot be its own parent");
    }

    if (region != null) {
      throw new ValidationException(
        "Geographic region can only be set on main areas",
      );
    }
  }

  private async requireArea(id: string) {
    const area = await this.getAreaById(id);
    if (!area) throw new ResourceNotFoundException("Delivery area", id);
    return area;
  }
}
