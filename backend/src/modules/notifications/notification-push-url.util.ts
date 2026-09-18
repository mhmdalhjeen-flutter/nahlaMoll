import { NotificationTargetType } from "@prisma/client";

export function buildNotificationPushUrl(
  targetType: NotificationTargetType,
  targetId: string | null,
): string | null {
  switch (targetType) {
    case NotificationTargetType.ORDER:
      return targetId ? `/orders/${targetId}` : null;
    case NotificationTargetType.PRODUCT:
    case NotificationTargetType.OFFER:
      return targetId ? `/products/${targetId}` : "/products?section=offers";
    case NotificationTargetType.SUPPORT:
      return "/support";
    case NotificationTargetType.ANNOUNCEMENT:
      return "/announcements";
    case NotificationTargetType.NONE:
    default:
      return "/notifications";
  }
}
