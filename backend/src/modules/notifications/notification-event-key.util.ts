import { OrderStatus } from "@prisma/client";

export function buildOrderStatusEventKey(
  orderId: string,
  status: OrderStatus,
): string {
  return `order:${orderId}:status:${status}`;
}

export function buildSupportReplyEventKey(supportMessageId: string): string {
  return `support:${supportMessageId}:reply`;
}

export function buildAnnouncementPublishedEventKey(
  announcementId: string,
): string {
  return `announcement:${announcementId}:published`;
}
