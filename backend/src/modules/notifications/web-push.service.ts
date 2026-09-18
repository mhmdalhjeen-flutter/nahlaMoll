import { Injectable, Logger } from "@nestjs/common";
import { CustomerNotification } from "@prisma/client";
import webpush, { WebPushError } from "web-push";
import { getVapidConfig, isWebPushConfigured } from "../../config/vapid.config";
import { PrismaService } from "../prisma/prisma.service";
import { isPushBlockedByDoNotDisturb } from "./notification-dnd.util";
import { ensureNotificationPreferences } from "./notification-preferences.helper";
import { buildNotificationPushUrl } from "./notification-push-url.util";
import { PushSubscriptionService } from "./push-subscription.service";

export interface WebPushPayload {
  notificationId: string;
  title: string;
  message: string;
  targetType: string;
  targetId: string | null;
  url: string | null;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private vapidInitialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushSubscriptionService: PushSubscriptionService,
  ) {}

  isConfigured(): boolean {
    return isWebPushConfigured();
  }

  buildPayload(notification: CustomerNotification): WebPushPayload {
    return {
      notificationId: notification.id,
      title: notification.title,
      message: notification.message,
      targetType: notification.targetType,
      targetId: notification.targetId,
      url: buildNotificationPushUrl(
        notification.targetType,
        notification.targetId,
      ),
    };
  }

  async deliverNotification(notificationId: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    try {
      const notification = await this.prisma.customerNotification.findUnique({
        where: { id: notificationId },
      });

      if (!notification || !notification.pushEligible) {
        return;
      }

      if (notification.pushDeliveredAt) {
        return;
      }

      const preferences = await ensureNotificationPreferences(
        this.prisma,
        notification.userId,
      );
      if (isPushBlockedByDoNotDisturb(preferences)) {
        return;
      }

      await this.prisma.customerNotification.update({
        where: { id: notification.id },
        data: { pushAttemptedAt: new Date() },
      });

      this.ensureVapidConfigured();

      const subscriptions =
        await this.pushSubscriptionService.listActiveForUser(notification.userId);

      if (subscriptions.length === 0) {
        await this.prisma.customerNotification.update({
          where: { id: notification.id },
          data: {
            pushError: "No active push subscriptions",
          },
        });
        return;
      }

      const payload = JSON.stringify(this.buildPayload(notification));
      let successCount = 0;
      const errors: string[] = [];

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
          );
          successCount += 1;
          await this.pushSubscriptionService.touchLastUsed(subscription.id);
        } catch (error) {
          if (this.isInvalidSubscriptionError(error)) {
            await this.pushSubscriptionService.markInvalidated(subscription.id);
            errors.push(`invalid:${subscription.id}`);
            continue;
          }

          errors.push(this.safeErrorMessage(error));
          this.logger.warn(
            `Push delivery failed for notification ${notification.id} subscription ${subscription.id}`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      if (successCount > 0) {
        await this.prisma.customerNotification.update({
          where: { id: notification.id },
          data: {
            pushDeliveredAt: new Date(),
            pushError: null,
          },
        });
        return;
      }

      await this.prisma.customerNotification.update({
        where: { id: notification.id },
        data: {
          pushError: errors.join("; ") || "Push delivery failed",
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to deliver push for notification ${notificationId}`,
        error instanceof Error ? error.stack : String(error),
      );

      try {
        await this.prisma.customerNotification.update({
          where: { id: notificationId },
          data: {
            pushError: this.safeErrorMessage(error),
          },
        });
      } catch {
        // Best-effort diagnostic only.
      }
    }
  }

  private ensureVapidConfigured() {
    if (this.vapidInitialized) {
      return;
    }

    const config = getVapidConfig();
    if (!config) {
      throw new Error("Web Push is not configured");
    }

    webpush.setVapidDetails(
      config.subject,
      config.publicKey,
      config.privateKey,
    );
    this.vapidInitialized = true;
  }

  private isInvalidSubscriptionError(error: unknown): boolean {
    if (error instanceof WebPushError) {
      return error.statusCode === 404 || error.statusCode === 410;
    }

    const statusCode = (error as { statusCode?: number } | undefined)
      ?.statusCode;
    return statusCode === 404 || statusCode === 410;
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof WebPushError) {
      return `WebPushError ${error.statusCode}`;
    }
    if (error instanceof Error) {
      return error.message.slice(0, 200);
    }
    return "Unknown push error";
  }
}
