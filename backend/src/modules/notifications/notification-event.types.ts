import { OrderStatus } from "@prisma/client";

export interface EmitOrderStatusChangeInput {
  userId: string;
  orderId: string;
  orderNumber: string | number;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
}

export interface EmitSupportReplyInput {
  userId: string;
  supportMessageId: string;
}

export interface EmitAnnouncementPublishedInput {
  userId: string;
  announcementId: string;
  /** Announcement body/title used as the notification message. */
  announcementMessage: string;
}
