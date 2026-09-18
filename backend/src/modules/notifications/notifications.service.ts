import { Injectable } from "@nestjs/common";
import {
  clampPageLimit,
  paginateSkip,
  type PaginatedResult,
} from "../../common/dtos/paginated-result.interface";
import { ResourceNotFoundException } from "../../common/exceptions/business.exception";
import { PrismaService } from "../prisma/prisma.service";
import { NOTIFICATIONS_DEFAULT_LIMIT } from "./dtos/notifications-query.dto";
import {
  NOTIFICATION_PREFERENCE_DEFAULTS,
  type NotificationPreferencesResponse,
} from "./notification-preferences.constants";
import { UpdateNotificationPreferencesDto } from "./dtos/update-notification-preferences.dto";
import {
  CustomerNotificationResponse,
  serializeCustomerNotification,
} from "./notification.serializer";
import { isWebPushConfigured } from "../../config/vapid.config";

/** Capability flag — VAPID must be configured for push delivery. */
const PUSH_DELIVERY_SUPPORTED = isWebPushConfigured();
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

  async findAllForCustomer(
    userId: string,
    page = 1,
    limit = NOTIFICATIONS_DEFAULT_LIMIT,
  ): Promise<PaginatedResult<CustomerNotificationResponse>> {
    const pageNumber = Math.max(page, 1);
    const pageSize = clampPageLimit(limit, NOTIFICATIONS_DEFAULT_LIMIT);
    const skip = paginateSkip(pageNumber, pageSize);
    const where = {
      userId,
      inAppEligible: true,
    };

    const [rows, total] = await Promise.all([
      this.prisma.customerNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.customerNotification.count({ where }),
    ]);

    return {
      items: rows.map(serializeCustomerNotification),
      total,
      page: pageNumber,
      pageSize,
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.customerNotification.count({
      where: {
        userId,
        inAppEligible: true,
        readAt: null,
      },
    });

    return { count };
  }

  async markRead(
    userId: string,
    notificationId: string,
  ): Promise<CustomerNotificationResponse> {
    const row = await this.prisma.customerNotification.findFirst({
      where: {
        id: notificationId,
        userId,
        inAppEligible: true,
      },
    });

    if (!row) {
      throw new ResourceNotFoundException("Notification", notificationId);
    }

    const updated =
      row.readAt !== null
        ? row
        : await this.prisma.customerNotification.update({
            where: { id: row.id },
            data: { readAt: new Date() },
          });

    return serializeCustomerNotification(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.customerNotification.updateMany({
      where: {
        userId,
        inAppEligible: true,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
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
    inAppEnabled: boolean;
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
      inAppEnabled: row.inAppEnabled,
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
