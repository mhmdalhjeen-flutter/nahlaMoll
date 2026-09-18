import { Test, TestingModule } from "@nestjs/testing";
import {
  NotificationEventType,
  NotificationTargetType,
} from "@prisma/client";
import webpush, { WebPushError } from "web-push";
import { WebPushService } from "./web-push.service";
import { PrismaService } from "../prisma/prisma.service";
import { PushSubscriptionService } from "./push-subscription.service";

jest.mock("web-push", () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
  WebPushError: class WebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = "WebPushError";
      this.statusCode = statusCode;
    }
  },
}));

jest.mock("../../config/vapid.config", () => ({
  isWebPushConfigured: jest.fn(() => true),
  getVapidConfig: jest.fn(() => ({
    publicKey: "public",
    privateKey: "private",
    subject: "mailto:test@example.com",
  })),
}));

const notification = {
  id: "notif-1",
  userId: "user-1",
  eventType: NotificationEventType.ORDER_CONFIRMED,
  eventKey: "order:1:status:CONFIRMED",
  title: "تأكيد الطلب",
  message: "تم تأكيد الطلب وسيتم تجهيزه",
  targetType: NotificationTargetType.ORDER,
  targetId: "order-1",
  metadata: null,
  readAt: null,
  inAppEligible: true,
  pushEligible: true,
  pushAttemptedAt: null,
  pushDeliveredAt: null,
  pushError: null,
  createdAt: new Date("2026-09-16T12:00:00.000Z"),
};

const mockPrisma = {
  customerNotification: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  customerNotificationPreferences: {
    upsert: jest.fn(),
  },
};

const mockPushSubscriptionService = {
  listActiveForUser: jest.fn(),
  markInvalidated: jest.fn(),
  touchLastUsed: jest.fn(),
};

function mockWebPushError(statusCode: number, message = "push error") {
  return new (WebPushError as unknown as new (
    message: string,
    statusCode: number,
  ) => WebPushError)(message, statusCode);
}

describe("WebPushService", () => {
  let service: WebPushService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebPushService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: PushSubscriptionService,
          useValue: mockPushSubscriptionService,
        },
      ],
    }).compile();

    service = module.get(WebPushService);
    jest.clearAllMocks();
    mockPrisma.customerNotification.findUnique.mockResolvedValue(notification);
    mockPrisma.customerNotification.update.mockResolvedValue(notification);
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue({
      inAppEnabled: true,
      pushEnabled: true,
      orderUpdates: true,
      abuAlaaNews: true,
      doNotDisturbEnabled: false,
      doNotDisturbFrom: "22:00",
      doNotDisturbUntil: "08:00",
      updatedAt: new Date(),
    });
  });

  it("records pushAttemptedAt and pushDeliveredAt on success", async () => {
    mockPushSubscriptionService.listActiveForUser.mockResolvedValue([
      {
        id: "sub-1",
        endpoint: "https://push.example/1",
        p256dh: "p256dh",
        auth: "auth",
      },
    ]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);

    await service.deliverNotification("notif-1");

    expect(mockPrisma.customerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notif-1" },
        data: { pushAttemptedAt: expect.any(Date) },
      }),
    );
    expect(mockPrisma.customerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notif-1" },
        data: {
          pushDeliveredAt: expect.any(Date),
          pushError: null,
        },
      }),
    );
  });

  it("sends to multiple subscriptions and succeeds if one device succeeds", async () => {
    mockPushSubscriptionService.listActiveForUser.mockResolvedValue([
      {
        id: "sub-1",
        endpoint: "https://push.example/1",
        p256dh: "p256dh-1",
        auth: "auth-1",
      },
      {
        id: "sub-2",
        endpoint: "https://push.example/2",
        p256dh: "p256dh-2",
        auth: "auth-2",
      },
    ]);
    (webpush.sendNotification as jest.Mock)
      .mockRejectedValueOnce(mockWebPushError(410, "gone"))
      .mockResolvedValueOnce(undefined);

    await service.deliverNotification("notif-1");

    expect(mockPushSubscriptionService.markInvalidated).toHaveBeenCalledWith(
      "sub-1",
    );
    expect(mockPushSubscriptionService.touchLastUsed).toHaveBeenCalledWith(
      "sub-2",
    );
    expect(mockPrisma.customerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          pushDeliveredAt: expect.any(Date),
          pushError: null,
        },
      }),
    );
  });

  it("records pushError when all subscriptions fail", async () => {
    mockPushSubscriptionService.listActiveForUser.mockResolvedValue([
      {
        id: "sub-1",
        endpoint: "https://push.example/1",
        p256dh: "p256dh",
        auth: "auth",
      },
    ]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue(
      new Error("network"),
    );

    await service.deliverNotification("notif-1");

    expect(mockPrisma.customerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pushError: expect.any(String),
        }),
      }),
    );
  });

  it("skips delivery when pushEligible is false", async () => {
    mockPrisma.customerNotification.findUnique.mockResolvedValue({
      ...notification,
      pushEligible: false,
    });

    await service.deliverNotification("notif-1");

    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("skips delivery during do-not-disturb without recording a failure", async () => {
    mockPrisma.customerNotificationPreferences.upsert.mockResolvedValue({
      inAppEnabled: true,
      pushEnabled: true,
      orderUpdates: true,
      abuAlaaNews: true,
      doNotDisturbEnabled: true,
      doNotDisturbFrom: "00:00",
      doNotDisturbUntil: "23:59",
      updatedAt: new Date(),
    });

    await service.deliverNotification("notif-1");

    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(mockPrisma.customerNotification.update).not.toHaveBeenCalled();
  });

  it("skips delivery when VAPID is not configured", async () => {
    const { isWebPushConfigured } = jest.requireMock("../../config/vapid.config");
    isWebPushConfigured.mockReturnValue(false);

    await service.deliverNotification("notif-1");

    expect(webpush.sendNotification).not.toHaveBeenCalled();
    isWebPushConfigured.mockReturnValue(true);
  });

  it("invalidates subscriptions on 404 responses", async () => {
    mockPushSubscriptionService.listActiveForUser.mockResolvedValue([
      {
        id: "sub-404",
        endpoint: "https://push.example/404",
        p256dh: "p256dh",
        auth: "auth",
      },
    ]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue(
      mockWebPushError(404, "not found"),
    );

    await service.deliverNotification("notif-1");

    expect(mockPushSubscriptionService.markInvalidated).toHaveBeenCalledWith(
      "sub-404",
    );
  });
});
