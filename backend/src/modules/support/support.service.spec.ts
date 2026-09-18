import { Test, TestingModule } from "@nestjs/testing";
import { SupportService } from "./support.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationEventService } from "../notifications/notification-event.service";
import { ResourceNotFoundException } from "../../common/exceptions/business.exception";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  supportMessage: {
    updateMany: jest.fn(),
    create: jest.fn(),
  },
};

const mockNotificationEventService = {
  emitSupportReply: jest.fn().mockResolvedValue(null),
};

describe("SupportService", () => {
  let service: SupportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationEventService,
          useValue: mockNotificationEventService,
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
    jest.clearAllMocks();
  });

  it("emits support reply notification after admin reply is created", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    mockPrisma.supportMessage.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.supportMessage.create.mockResolvedValue({
      id: "msg-1",
      userId: "user-1",
      message: "مرحباً",
      isAdmin: true,
    });

    const result = await service.replyAdmin("user-1", {
      message: "مرحباً",
    });

    expect(result.id).toBe("msg-1");
    expect(mockNotificationEventService.emitSupportReply).toHaveBeenCalledWith({
      userId: "user-1",
      supportMessageId: "msg-1",
    });
  });

  it("does not block support reply on notification emission (fire-and-forget)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    mockPrisma.supportMessage.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.supportMessage.create.mockResolvedValue({
      id: "msg-2",
      userId: "user-1",
      message: "تم",
      isAdmin: true,
    });

    const result = await service.replyAdmin("user-1", { message: "تم" });

    expect(result.id).toBe("msg-2");
    expect(mockNotificationEventService.emitSupportReply).toHaveBeenCalledTimes(1);
  });

  it("preserves existing not-found behavior for missing user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.replyAdmin("missing-user", { message: "test" }),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(mockNotificationEventService.emitSupportReply).not.toHaveBeenCalled();
  });
});
