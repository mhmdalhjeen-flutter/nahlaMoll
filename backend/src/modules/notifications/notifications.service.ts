import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  NOTIFICATION_PREFERENCE_DEFAULTS,
  type NotificationPreferencesResponse,
} from "./notification-preferences.constants";
import { UpdateNotificationPreferencesDto } from "./dtos/update-notification-preferences.dto";

/** Flip when push/email delivery providers are wired. Preferences are stored regardless. */
const PUSH_DELIVERY_SUPPORTED = false;
const EMAIL_DELIVERY_SUPPORTED = false;
const DELIVERY_SCHEDULING_SUPPORTED = false;

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(
    userId: string,
  ): Promise<NotificationPreferencesResponse> {
    const row = await this.ensurePreferences(userId);
    return this.toResponse(row);
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponse> {
    await this.ensurePreferences(userId);

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }

    const updated = await this.prisma.customerNotificationPreferences.update({
      where: { userId },
      data,
    });

    return this.toResponse(updated);
  }

  private async ensurePreferences(userId: string) {
    return this.prisma.customerNotificationPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...NOTIFICATION_PREFERENCE_DEFAULTS,
      },
      update: {},
    });
  }

  private toResponse(row: {
    orderUpdates: boolean;
    freeDelivery: boolean;
    favorites: boolean;
    offers: boolean;
    personalRecommendations: boolean;
    newProducts: boolean;
    abuAlaaNews: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    doNotDisturbEnabled: boolean;
    doNotDisturbFrom: string | null;
    doNotDisturbUntil: string | null;
    updatedAt: Date;
  }): NotificationPreferencesResponse {
    return {
      orderUpdates: row.orderUpdates,
      freeDelivery: row.freeDelivery,
      favorites: row.favorites,
      offers: row.offers,
      personalRecommendations: row.personalRecommendations,
      newProducts: row.newProducts,
      abuAlaaNews: row.abuAlaaNews,
      pushEnabled: row.pushEnabled,
      emailEnabled: row.emailEnabled,
      doNotDisturbEnabled: row.doNotDisturbEnabled,
      doNotDisturbFrom: row.doNotDisturbFrom,
      doNotDisturbUntil: row.doNotDisturbUntil,
      updatedAt: row.updatedAt.toISOString(),
      channels: {
        pushSupported: PUSH_DELIVERY_SUPPORTED,
        emailSupported: EMAIL_DELIVERY_SUPPORTED,
        deliverySchedulingSupported: DELIVERY_SCHEDULING_SUPPORTED,
      },
    };
  }
}
