import { Test, TestingModule } from "@nestjs/testing";
import {
  NotificationEventType,
  NotificationTargetType,
} from "@prisma/client";
import { ResourceNotFoundException } from "../../common/exceptions/business.exception";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const now = new Date("2026-09-16T12:00:00.000Z");

const sampleRow = {
  id: "notif-1",
  userId: "user-1",
  eventType: NotificationEventType.ORDER_CONFIRMED,
  eventKey: "order:order-1:status:CONFIRMED",
  title: "تأكيد الطلب",
  message: "تم تأكيد الطلب وسيتم تجهيزه",
  targetType: NotificationTargetType.ORDER,
  targetId: "order-1",
  metadata: null,
  readAt: null,
  inAppEligible: true,
  pushEligible: false,
  pushAttemptedAt: null,
  pushDeliveredAt: null,
  pushError: null,
  createdAt: now,
};

const mockPrisma = {
  customerNotificationPreferences: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
  customerNotification: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe("NotificationsService inbox", () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it("lists only in-app eligible notifications for the authenticated user", async () => {
    mockPrisma.customerNotification.findMany.mockResolvedValue([sampleRow]);
    mockPrisma.customerNotification.count.mockResolvedValue(1);

    const result = await service.findAllForCustomer("user-1", 1, 20);

    expect(mockPrisma.customerNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", inAppEligible: true },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "notif-1",
        type: "order",
        isRead: false,
        targetType: "order",
        targetId: "order-1",
      }),
    );
    expect(result.total).toBe(1);
  });

  it("returns the correct unread count", async () => {
    mockPrisma.customerNotification.count.mockResolvedValue(3);

    const result = await service.getUnreadCount("user-1");

    expect(mockPrisma.customerNotification.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        inAppEligible: true,
        readAt: null,
      },
    });
    expect(result).toEqual({ count: 3 });
  });

  it("marks one notification as read", async () => {
    mockPrisma.customerNotification.findFirst.mockResolvedValue(sampleRow);
    mockPrisma.customerNotification.update.mockResolvedValue({
      ...sampleRow,
      readAt: new Date("2026-09-16T12:05:00.000Z"),
    });

    const result = await service.markRead("user-1", "notif-1");

    expect(mockPrisma.customerNotification.findFirst).toHaveBeenCalledWith({
      where: {
        id: "notif-1",
        userId: "user-1",
        inAppEligible: true,
      },
    });
    expect(result.isRead).toBe(true);
  });

  it("mark read is idempotent when already read", async () => {
    const readRow = {
      ...sampleRow,
      readAt: new Date("2026-09-16T11:00:00.000Z"),
    };
    mockPrisma.customerNotification.findFirst.mockResolvedValue(readRow);

    const result = await service.markRead("user-1", "notif-1");

    expect(mockPrisma.customerNotification.update).not.toHaveBeenCalled();
    expect(result.isRead).toBe(true);
  });

  it("blocks cross-user notification access with not found", async () => {
    mockPrisma.customerNotification.findFirst.mockResolvedValue(null);

    await expect(service.markRead("user-2", "notif-1")).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });

  it("marks all eligible unread notifications as read for the current user", async () => {
    mockPrisma.customerNotification.updateMany.mockResolvedValue({ count: 4 });

    const result = await service.markAllRead("user-1");

    expect(mockPrisma.customerNotification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        inAppEligible: true,
        readAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
    expect(result).toEqual({ updated: 4 });
  });

  it("read-all is idempotent when there are no unread notifications", async () => {
    mockPrisma.customerNotification.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.markAllRead("user-1");

    expect(result).toEqual({ updated: 0 });
  });
});
