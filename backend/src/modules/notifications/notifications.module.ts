import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationEventService } from "./notification-event.service";
import { NotificationsService } from "./notifications.service";
import { PushSubscriptionService } from "./push-subscription.service";
import { WebPushService } from "./web-push.service";

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationEventService,
    PushSubscriptionService,
    WebPushService,
  ],
  exports: [
    NotificationsService,
    NotificationEventService,
    PushSubscriptionService,
    WebPushService,
  ],
})
export class NotificationsModule {}
