import {
  CustomerNotification,
  NotificationEventType,
  NotificationTargetType,
  Prisma,
} from "@prisma/client";

/** Frontend-compatible notification DTO (store/src/lib/types.ts). */
export interface CustomerNotificationResponse {
  id: string;
  type: "order" | "delivery" | "free_delivery" | "favorite" | "offer" | "system";
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  targetType: "order" | "product" | "offer" | "cart" | "none";
  targetId?: string | null;
  image?: string | null;
  metadata?: Record<string, unknown> | null;
}

function mapEventTypeToUiType(
  eventType: NotificationEventType,
): CustomerNotificationResponse["type"] {
  switch (eventType) {
    case NotificationEventType.ORDER_SHIPPED:
      return "delivery";
    case NotificationEventType.ORDER_CONFIRMED:
    case NotificationEventType.ORDER_DELIVERED:
    case NotificationEventType.ORDER_REJECTED:
      return "order";
    case NotificationEventType.SUPPORT_REPLY:
    case NotificationEventType.NEW_ANNOUNCEMENT:
      return "system";
    default:
      return "system";
  }
}

function mapTargetTypeToUiType(
  targetType: NotificationTargetType,
): CustomerNotificationResponse["targetType"] {
  switch (targetType) {
    case NotificationTargetType.ORDER:
      return "order";
    case NotificationTargetType.PRODUCT:
      return "product";
    case NotificationTargetType.OFFER:
      return "offer";
    case NotificationTargetType.SUPPORT:
    case NotificationTargetType.ANNOUNCEMENT:
    case NotificationTargetType.NONE:
      return "none";
    default:
      return "none";
  }
}

function toMetadataRecord(
  metadata: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (metadata === null || metadata === undefined) {
    return null;
  }
  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return null;
}

export function serializeCustomerNotification(
  row: CustomerNotification,
): CustomerNotificationResponse {
  return {
    id: row.id,
    type: mapEventTypeToUiType(row.eventType),
    title: row.title,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    isRead: row.readAt !== null,
    targetType: mapTargetTypeToUiType(row.targetType),
    targetId: row.targetId,
    image: null,
    metadata: toMetadataRecord(row.metadata),
  };
}
