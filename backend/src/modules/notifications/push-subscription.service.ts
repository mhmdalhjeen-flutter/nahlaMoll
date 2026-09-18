import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterPushSubscriptionDto } from "./dtos/register-push-subscription.dto";

@Injectable()
export class PushSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterPushSubscriptionDto) {
    const now = new Date();

    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent?.trim() || null,
        lastUsedAt: now,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent?.trim() || null,
        lastUsedAt: now,
        invalidatedAt: null,
      },
    });
  }

  async deactivate(userId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.updateMany({
      where: {
        userId,
        endpoint,
        invalidatedAt: null,
      },
      data: {
        invalidatedAt: new Date(),
      },
    });

    return { deactivated: result.count > 0 };
  }

  async listActiveForUser(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: {
        userId,
        invalidatedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async markInvalidated(subscriptionId: string) {
    await this.prisma.pushSubscription.updateMany({
      where: { id: subscriptionId, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    });
  }

  async touchLastUsed(subscriptionId: string) {
    await this.prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: { lastUsedAt: new Date() },
    });
  }
}
