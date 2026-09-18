import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSupportMessageDto } from "./dtos/create-support-message.dto";
import { AdminReplySupportDto } from "./dtos/admin-reply-support.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exception";
import { NotificationEventService } from "../notifications/notification-event.service";

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notificationEventService: NotificationEventService,
  ) {}

  async findMine(userId: string) {
    return this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createCustomerMessage(userId: string, dto: CreateSupportMessageDto) {
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, customerId: userId },
      });
      if (!order) {
        throw new ResourceNotFoundException("Order", dto.orderId);
      }
    }

    return this.prisma.supportMessage.create({
      data: {
        userId,
        orderId: dto.orderId || null,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        isAdmin: false,
      },
    });
  }

  async findAllAdmin(unreadOnly = false) {
    return this.prisma.supportMessage.findMany({
      where: unreadOnly ? { isRead: false, isAdmin: false } : undefined,
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findThreadAdmin(userId: string) {
    return this.prisma.supportMessage.findMany({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async replyAdmin(userId: string, dto: AdminReplySupportDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ResourceNotFoundException("User", userId);
    }

    await this.prisma.supportMessage.updateMany({
      where: { userId, isAdmin: false, isRead: false },
      data: { isRead: true },
    });

    const message = await this.prisma.supportMessage.create({
      data: {
        userId,
        subject: dto.subject?.trim() || "رد الإدارة",
        message: dto.message.trim(),
        isAdmin: true,
      },
    });

    void this.notificationEventService.emitSupportReply({
      userId,
      supportMessageId: message.id,
    });

    return message;
  }

  async markThreadRead(userId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { userId, isAdmin: false, isRead: false },
      data: { isRead: true },
    });
    return { markedRead: true };
  }
}
