import { Test, TestingModule } from "@nestjs/testing";
import {
  NotificationEventType,
  NotificationTargetType,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { NotificationEventService } from "./notification-event.service";
import { PrismaService } from "../prisma/prisma.service";
import { WebPushService } from "./web-push.service";

jest.mock("../../config/vapid.config", () => ({
  isWebPushConfigured: jest.fn(() => false),
}));

const defaultPreferences = {
  inAppEnabled: true,
  pushEnabled: false,
  orderUpdates: true,
  abuAlaaNews: true,
  doNotDisturbEnabled: true,
  doNotDisturbFrom: "22:00",
  doNotDisturbUntil: "08:00",
  updatedAt: new Date("2026-09-16T10:00:00.000Z"),
};

const mockWebPushService = {
  deliverNotification: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  customerNotificationPreferences: {
    upsert: jest.fn(),
  },
  customerNotification: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe("NotificationEventService", () => {
  let service: NotificationEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEventService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebPushService, useValue: mockWebPushService },
      ],
    }).compile();

    service = module.get<NotificationEventService>(NotificationEventService);
    jest.clearAllMocks();
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue(
      defaultPreferences,
    );
  });

  it("creates ORDER_CONFIRMED with exact Arabic copy", async () => {
    mockPrisma.customerNotification.create.mockResolvedValue({
      id: "n-1",
      eventType: NotificationEventType.ORDER_CONFIRMED,
    });

    await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PAYMENT_VERIFIED,
      newStatus: OrderStatus.CONFIRMED,
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: NotificationEventType.ORDER_CONFIRMED,
        eventKey: "order:order-1:status:CONFIRMED",
        title: "تأكيد الطلب",
        message: "تم تأكيد الطلب وسيتم تجهيزه",
        targetType: NotificationTargetType.ORDER,
        targetId: "order-1",
        inAppEligible: true,
        pushEligible: false,
      }),
    });
  });

  it("creates ORDER_SHIPPED with exact Arabic copy", async () => {
    mockPrisma.customerNotification.create.mockResolvedValue({ id: "n-2" });

    await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.CONFIRMED,
      newStatus: OrderStatus.SHIPPED,
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: NotificationEventType.ORDER_SHIPPED,
        title: "طلبك في الطريق",
        message: "تم تجهيز طلبك وهو في الطريق إليك",
      }),
    });
  });

  it("creates ORDER_DELIVERED with order number in message", async () => {
    mockPrisma.customerNotification.create.mockResolvedValue({ id: "n-3" });

    await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.SHIPPED,
      newStatus: OrderStatus.DELIVERED,
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: NotificationEventType.ORDER_DELIVERED,
        title: "تم الاستلام",
        message: "تم استلام طلبك رقم 1042",
      }),
    });
  });

  it("creates ORDER_REJECTED with order number in message", async () => {
    mockPrisma.customerNotification.create.mockResolvedValue({ id: "n-4" });

    await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PAYMENT_SUBMITTED,
      newStatus: OrderStatus.PAYMENT_REJECTED,
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: NotificationEventType.ORDER_REJECTED,
        title: "رفض الطلب",
        message: "تم رفض الطلب رقم 1042",
      }),
    });
  });

  it("creates SUPPORT_REPLY with exact Arabic copy", async () => {
    mockPrisma.customerNotification.create.mockResolvedValue({ id: "n-5" });

    await service.emitSupportReply({
      userId: "user-1",
      supportMessageId: "msg-1",
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: NotificationEventType.SUPPORT_REPLY,
        eventKey: "support:msg-1:reply",
        title: "رد الدعم الفني",
        message: "تم إرسال رسالة جديدة من الدعم الفني",
        targetType: NotificationTargetType.SUPPORT,
        targetId: "msg-1",
      }),
    });
  });

  it("creates NEW_ANNOUNCEMENT with announcement message", async () => {
    mockPrisma.customerNotification.create.mockResolvedValue({ id: "n-6" });

    await service.emitAnnouncementPublished({
      userId: "user-1",
      announcementId: "ann-1",
      announcementMessage: "خصم 20% على جميع المنتجات",
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: NotificationEventType.NEW_ANNOUNCEMENT,
        eventKey: "announcement:ann-1:published",
        title: "إعلان جديد",
        message: "خصم 20% على جميع المنتجات",
        targetType: NotificationTargetType.ANNOUNCEMENT,
        targetId: "ann-1",
      }),
    });
  });

  it("does not create duplicate notifications for the same userId + eventKey", async () => {
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "5.22.0" },
    );
    mockPrisma.customerNotification.create.mockRejectedValue(duplicateError);
    mockPrisma.customerNotification.findUnique.mockResolvedValue({
      id: "existing-1",
      eventKey: "order:order-1:status:CONFIRMED",
    });

    const result = await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PAYMENT_VERIFIED,
      newStatus: OrderStatus.CONFIRMED,
    });

    expect(result).toEqual(
      expect.objectContaining({ id: "existing-1" }),
    );
    expect(mockPrisma.customerNotification.create).toHaveBeenCalledTimes(1);
  });

  it("sets inAppEligible=false when inAppEnabled=false", async () => {
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue({
      ...defaultPreferences,
      inAppEnabled: false,
    });
    mockPrisma.customerNotification.create.mockResolvedValue({ id: "n-7" });

    await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PAYMENT_VERIFIED,
      newStatus: OrderStatus.CONFIRMED,
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ inAppEligible: false }),
    });
  });

  it("sets inAppEligible=false when category preference is disabled", async () => {
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue({
      ...defaultPreferences,
      orderUpdates: false,
    });
    mockPrisma.customerNotification.create.mockResolvedValue({ id: "n-8" });

    await service.emitSupportReply({
      userId: "user-1",
      supportMessageId: "msg-2",
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ inAppEligible: false }),
    });
  });

  it("keeps pushEligible false when push is not configured", async () => {
    mockPrisma.customerNotification.create.mockResolvedValue({ id: "n-9" });

    await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PAYMENT_VERIFIED,
      newStatus: OrderStatus.CONFIRMED,
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ pushEligible: false }),
    });
    expect(mockWebPushService.deliverNotification).not.toHaveBeenCalled();
  });

  it("triggers push delivery when pushEligible is true", async () => {
    const { isWebPushConfigured } = jest.requireMock("../../config/vapid.config");
    isWebPushConfigured.mockReturnValue(true);
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue({
      ...defaultPreferences,
      pushEnabled: true,
    });
    mockPrisma.customerNotification.create.mockResolvedValue({
      id: "n-push",
      pushEligible: true,
      pushDeliveredAt: null,
    });

    await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PAYMENT_VERIFIED,
      newStatus: OrderStatus.CONFIRMED,
    });

    expect(mockWebPushService.deliverNotification).toHaveBeenCalledWith("n-push");
    isWebPushConfigured.mockReturnValue(false);
  });

  it("does not suppress in-app or push eligibility because of DND", async () => {
    const { isWebPushConfigured } = jest.requireMock("../../config/vapid.config");
    isWebPushConfigured.mockReturnValue(true);
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue({
      ...defaultPreferences,
      pushEnabled: true,
      doNotDisturbEnabled: true,
    });
    mockPrisma.customerNotification.create.mockResolvedValue({
      id: "n-10",
      pushEligible: true,
      pushDeliveredAt: null,
    });

    await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PAYMENT_VERIFIED,
      newStatus: OrderStatus.CONFIRMED,
    });

    expect(mockPrisma.customerNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inAppEligible: true,
        pushEligible: true,
      }),
    });
    expect(mockWebPushService.deliverNotification).toHaveBeenCalledWith("n-10");
    isWebPushConfigured.mockReturnValue(false);
  });

  it("does not create a notification when status is unchanged", async () => {
    const result = await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.CONFIRMED,
      newStatus: OrderStatus.CONFIRMED,
    });

    expect(result).toBeNull();
    expect(mockPrisma.customerNotification.create).not.toHaveBeenCalled();
  });

  it("does not create a notification for unsupported status transitions", async () => {
    const result = await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PENDING,
      newStatus: OrderStatus.PROCESSING,
    });

    expect(result).toBeNull();
    expect(mockPrisma.customerNotification.create).not.toHaveBeenCalled();
  });

  it("swallows errors and returns null instead of throwing", async () => {
    mockPrisma.customerNotification.create.mockRejectedValue(
      new Error("database unavailable"),
    );

    const result = await service.emitOrderStatusChange({
      userId: "user-1",
      orderId: "order-1",
      orderNumber: "1042",
      previousStatus: OrderStatus.PAYMENT_VERIFIED,
      newStatus: OrderStatus.CONFIRMED,
    });

    expect(result).toBeNull();
  });
});
