import { Injectable, Logger } from "@nestjs/common";
import {
  CustomerNotification,
  NotificationEventType,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { isWebPushConfigured } from "../../config/vapid.config";
import { PrismaService } from "../prisma/prisma.service";
import {
  resolveAnnouncementPublishedCopy,
  resolveOrderStatusNotificationCopy,
  resolveSupportReplyCopy,
  type ResolvedNotificationCopy,
} from "./notification-copy.util";
import {
  resolveInAppEligible,
  resolvePushEligible,
} from "./notification-eligibility.util";
import {
  buildAnnouncementPublishedEventKey,
  buildOrderStatusEventKey,
  buildSupportReplyEventKey,
} from "./notification-event-key.util";
import type {
  EmitAnnouncementPublishedInput,
  EmitOrderStatusChangeInput,
  EmitSupportReplyInput,
} from "./notification-event.types";
import { ensureNotificationPreferences } from "./notification-preferences.helper";
import { UserRole } from "../users/enums/user-role.enum";
import { WebPushService } from "./web-push.service";

const ORDER_STATUS_TO_EVENT: Partial<
  Record<OrderStatus, NotificationEventType>
> = {
  [OrderStatus.CONFIRMED]: NotificationEventType.ORDER_CONFIRMED,
  [OrderStatus.SHIPPED]: NotificationEventType.ORDER_SHIPPED,
  [OrderStatus.DELIVERED]: NotificationEventType.ORDER_DELIVERED,
  [OrderStatus.PAYMENT_REJECTED]: NotificationEventType.ORDER_REJECTED,
  [OrderStatus.CANCELLED]: NotificationEventType.ORDER_REJECTED,
};

@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webPushService: WebPushService,
  ) {}

  async emitOrderStatusChange(
    input: EmitOrderStatusChangeInput,
  ): Promise<CustomerNotification | null> {
    try {
      if (input.previousStatus === input.newStatus) {
        return null;
      }

      const eventType = ORDER_STATUS_TO_EVENT[input.newStatus];
      if (!eventType) {
        return null;
      }

      const copy = resolveOrderStatusNotificationCopy(
        eventType,
        input.orderId,
        input.orderNumber,
      );
      const eventKey = buildOrderStatusEventKey(input.orderId, input.newStatus);

      return await this.createNotification({
        userId: input.userId,
        eventKey,
        copy,
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit order status notification for order ${input.orderId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  async emitSupportReply(
    input: EmitSupportReplyInput,
  ): Promise<CustomerNotification | null> {
    try {
      const copy = resolveSupportReplyCopy(input.supportMessageId);
      const eventKey = buildSupportReplyEventKey(input.supportMessageId);

      return await this.createNotification({
        userId: input.userId,
        eventKey,
        copy,
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit support reply notification for message ${input.supportMessageId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  async broadcastAnnouncementPublished(input: {
    announcementId: string;
    announcementMessage: string;
  }): Promise<void> {
    try {
      const customers = await this.prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        select: { id: true },
      });

      for (const customer of customers) {
        await this.emitAnnouncementPublished({
          userId: customer.id,
          announcementId: input.announcementId,
          announcementMessage: input.announcementMessage,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to broadcast announcement notification ${input.announcementId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async emitAnnouncementPublished(
    input: EmitAnnouncementPublishedInput,
  ): Promise<CustomerNotification | null> {
    try {
      const copy = resolveAnnouncementPublishedCopy(
        input.announcementId,
        input.announcementMessage,
      );
      const eventKey = buildAnnouncementPublishedEventKey(input.announcementId);

      return await this.createNotification({
        userId: input.userId,
        eventKey,
        copy,
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit announcement notification ${input.announcementId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  private async createNotification(params: {
    userId: string;
    eventKey: string;
    copy: ResolvedNotificationCopy;
  }): Promise<CustomerNotification | null> {
    const preferences = await ensureNotificationPreferences(
      this.prisma,
      params.userId,
    );
    const pushSupported = isWebPushConfigured();
    const inAppEligible = resolveInAppEligible(
      params.copy.eventType,
      preferences,
    );
    const pushEligible = resolvePushEligible(
      params.copy.eventType,
      preferences,
      pushSupported,
    );

    const data: Prisma.CustomerNotificationCreateInput = {
      user: { connect: { id: params.userId } },
      eventType: params.copy.eventType,
      eventKey: params.eventKey,
      title: params.copy.title,
      message: params.copy.message,
      targetType: params.copy.targetType,
      targetId: params.copy.targetId,
      ...(params.copy.metadata !== undefined
        ? { metadata: params.copy.metadata as Prisma.InputJsonValue }
        : {}),
      inAppEligible,
      pushEligible,
    };

    let notification: CustomerNotification | null = null;

    try {
      notification = await this.prisma.customerNotification.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        notification = await this.prisma.customerNotification.findUnique({
          where: {
            userId_eventKey: {
              userId: params.userId,
              eventKey: params.eventKey,
            },
          },
        });
      } else {
        throw error;
      }
    }

    if (
      notification?.pushEligible &&
      !notification.pushDeliveredAt
    ) {
      void this.webPushService.deliverNotification(notification.id);
    }

    return notification;
  }
}
