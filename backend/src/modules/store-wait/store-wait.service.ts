import { Injectable } from "@nestjs/common";
import {
  Prisma,
  StoreWaitRequestStatus,
  StoreWaitRequestType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStoreWaitDto } from "./dtos/create-store-wait.dto";
import { ValidationException } from "../../common/exceptions/business.exception";

const STORE_OPEN_NOTIFY_SUBJECT = "المتجر مفتوح الآن";
const STORE_OPEN_NOTIFY_MESSAGE =
  "أصبح المتجر مفتوحاً. يمكنك متابعة طلبك وإتمامه الآن.";

@Injectable()
export class StoreWaitService {
  constructor(private prisma: PrismaService) {}

  buildPayload(dto: CreateStoreWaitDto): Prisma.InputJsonValue {
    if (dto.type === StoreWaitRequestType.ADD_TO_CART) {
      if (!dto.productId) {
        throw new ValidationException("productId is required");
      }
      return {
        productId: dto.productId,
        variantId: dto.variantId ?? null,
        quantity: dto.quantity ?? 1,
      };
    }

    if (!dto.deliveryAreaId || !dto.deliveryAddress?.trim()) {
      throw new ValidationException(
        "deliveryAreaId and deliveryAddress are required",
      );
    }

    return {
      deliveryAreaId: dto.deliveryAreaId,
      deliveryAddress: dto.deliveryAddress.trim(),
      notes: dto.notes?.trim() || null,
    };
  }

  /** One active WAITING request per user — upsert for idempotency. */
  async registerWait(userId: string, dto: CreateStoreWaitDto) {
    const payload = this.buildPayload(dto);

    const existing = await this.prisma.storeWaitRequest.findFirst({
      where: { userId, status: StoreWaitRequestStatus.WAITING },
    });

    if (existing) {
      return this.prisma.storeWaitRequest.update({
        where: { id: existing.id },
        data: { type: dto.type, payload },
      });
    }

    return this.prisma.storeWaitRequest.create({
      data: {
        userId,
        type: dto.type,
        status: StoreWaitRequestStatus.WAITING,
        payload,
      },
    });
  }

  async getActiveForUser(userId: string) {
    return this.prisma.storeWaitRequest.findFirst({
      where: {
        userId,
        status: {
          in: [StoreWaitRequestStatus.WAITING, StoreWaitRequestStatus.NOTIFIED],
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async cancelActiveForUser(userId: string) {
    const result = await this.prisma.storeWaitRequest.updateMany({
      where: {
        userId,
        status: StoreWaitRequestStatus.WAITING,
      },
      data: { status: StoreWaitRequestStatus.CANCELLED },
    });
    return { cancelled: result.count > 0 };
  }

  async completeActiveForUser(userId: string) {
    await this.prisma.storeWaitRequest.updateMany({
      where: {
        userId,
        status: StoreWaitRequestStatus.NOTIFIED,
      },
      data: { status: StoreWaitRequestStatus.COMPLETED },
    });
    return { completed: true };
  }

  async notifyWaitingCustomers() {
    const waiting = await this.prisma.storeWaitRequest.findMany({
      where: { status: StoreWaitRequestStatus.WAITING },
    });

    if (waiting.length === 0) {
      return { notified: 0 };
    }

    for (const request of waiting) {
      await this.prisma.$transaction([
        this.prisma.supportMessage.create({
          data: {
            userId: request.userId,
            subject: STORE_OPEN_NOTIFY_SUBJECT,
            message: STORE_OPEN_NOTIFY_MESSAGE,
            isAdmin: true,
          },
        }),
        this.prisma.storeWaitRequest.update({
          where: { id: request.id },
          data: { status: StoreWaitRequestStatus.NOTIFIED },
        }),
      ]);
    }

    return { notified: waiting.length };
  }
}
