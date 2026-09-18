import {
  NotificationEventType,
  NotificationTargetType,
} from "@prisma/client";

export interface ResolvedNotificationCopy {
  eventType: NotificationEventType;
  title: string;
  message: string;
  targetType: NotificationTargetType;
  targetId: string | null;
  metadata?: Record<string, unknown>;
}

export function resolveOrderStatusNotificationCopy(
  eventType: NotificationEventType,
  orderId: string,
  orderNumber: string | number,
): ResolvedNotificationCopy {
  const orderNumberText = String(orderNumber);

  switch (eventType) {
    case NotificationEventType.ORDER_CONFIRMED:
      return {
        eventType,
        title: "تأكيد الطلب",
        message: "تم تأكيد الطلب وسيتم تجهيزه",
        targetType: NotificationTargetType.ORDER,
        targetId: orderId,
      };
    case NotificationEventType.ORDER_SHIPPED:
      return {
        eventType,
        title: "طلبك في الطريق",
        message: "تم تجهيز طلبك وهو في الطريق إليك",
        targetType: NotificationTargetType.ORDER,
        targetId: orderId,
      };
    case NotificationEventType.ORDER_DELIVERED:
      return {
        eventType,
        title: "تم الاستلام",
        message: `تم استلام طلبك رقم ${orderNumberText}`,
        targetType: NotificationTargetType.ORDER,
        targetId: orderId,
        metadata: { orderNumber: orderNumberText },
      };
    case NotificationEventType.ORDER_REJECTED:
      return {
        eventType,
        title: "رفض الطلب",
        message: `تم رفض الطلب رقم ${orderNumberText}`,
        targetType: NotificationTargetType.ORDER,
        targetId: orderId,
        metadata: { orderNumber: orderNumberText },
      };
    default:
      throw new Error(`Unsupported order notification event type: ${eventType}`);
  }
}

export function resolveSupportReplyCopy(
  supportMessageId: string,
): ResolvedNotificationCopy {
  return {
    eventType: NotificationEventType.SUPPORT_REPLY,
    title: "رد الدعم الفني",
    message: "تم إرسال رسالة جديدة من الدعم الفني",
    targetType: NotificationTargetType.SUPPORT,
    targetId: supportMessageId,
  };
}

export function resolveAnnouncementPublishedCopy(
  announcementId: string,
  announcementMessage: string,
): ResolvedNotificationCopy {
  return {
    eventType: NotificationEventType.NEW_ANNOUNCEMENT,
    title: "إعلان جديد",
    message: announcementMessage,
    targetType: NotificationTargetType.ANNOUNCEMENT,
    targetId: announcementId,
  };
}
