import { Test, TestingModule } from "@nestjs/testing";
import { AnnouncementsService } from "./announcements.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationEventService } from "../notifications/notification-event.service";
import { ResourceNotFoundException } from "../../common/exceptions/business.exception";

const mockPrisma = {
  announcement: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockNotificationEventService = {
  broadcastAnnouncementPublished: jest.fn().mockResolvedValue(undefined),
};

describe("AnnouncementsService", () => {
  let service: AnnouncementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationEventService,
          useValue: mockNotificationEventService,
        },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
    jest.clearAllMocks();
  });

  it("broadcasts notifications when a newly created announcement is published", async () => {
    const created = {
      id: "ann-1",
      title: "عرض جديد",
      content: "خصم 20%",
      isActive: true,
      startDate: new Date("2026-09-16T10:00:00.000Z"),
      endDate: null,
    };
    mockPrisma.announcement.create.mockResolvedValue(created);

    const result = await service.create({
      title: created.title,
      content: created.content,
      isActive: true,
      startDate: created.startDate,
    });

    expect(result).toEqual(created);
    expect(
      mockNotificationEventService.broadcastAnnouncementPublished,
    ).toHaveBeenCalledWith({
      announcementId: "ann-1",
      announcementMessage: "خصم 20%",
    });
  });

  it("does not broadcast when a created announcement is not yet published", async () => {
    mockPrisma.announcement.create.mockResolvedValue({
      id: "ann-2",
      title: "مسودة",
      content: "لاحقاً",
      isActive: false,
      startDate: new Date("2026-09-20T10:00:00.000Z"),
      endDate: null,
    });

    await service.create({
      title: "مسودة",
      content: "لاحقاً",
      isActive: false,
      startDate: new Date("2026-09-20T10:00:00.000Z"),
    });

    expect(
      mockNotificationEventService.broadcastAnnouncementPublished,
    ).not.toHaveBeenCalled();
  });

  it("broadcasts when an announcement becomes published on update", async () => {
    const existing = {
      id: "ann-3",
      title: "مسودة",
      content: "محتوى الإعلان",
      isActive: false,
      startDate: new Date("2026-09-16T10:00:00.000Z"),
      endDate: null,
    };
    const updated = {
      ...existing,
      isActive: true,
    };

    mockPrisma.announcement.findUnique.mockResolvedValue(existing);
    mockPrisma.announcement.update.mockResolvedValue(updated);

    const result = await service.update("ann-3", { isActive: true });

    expect(result.isActive).toBe(true);
    expect(
      mockNotificationEventService.broadcastAnnouncementPublished,
    ).toHaveBeenCalledWith({
      announcementId: "ann-3",
      announcementMessage: "محتوى الإعلان",
    });
  });

  it("does not rebroadcast when an already published announcement is edited", async () => {
    const published = {
      id: "ann-4",
      title: "منشور",
      content: "نص قديم",
      isActive: true,
      startDate: new Date("2026-09-16T08:00:00.000Z"),
      endDate: null,
    };

    mockPrisma.announcement.findUnique.mockResolvedValue(published);
    mockPrisma.announcement.update.mockResolvedValue({
      ...published,
      content: "نص محدث",
    });

    await service.update("ann-4", { content: "نص محدث" });

    expect(
      mockNotificationEventService.broadcastAnnouncementPublished,
    ).not.toHaveBeenCalled();
  });

  it("does not block announcement create on notification broadcast (fire-and-forget)", async () => {
    mockPrisma.announcement.create.mockResolvedValue({
      id: "ann-5",
      title: "عرض",
      content: "محتوى",
      isActive: true,
      startDate: new Date("2026-09-16T10:00:00.000Z"),
      endDate: null,
    });

    const result = await service.create({
      title: "عرض",
      content: "محتوى",
      isActive: true,
      startDate: new Date("2026-09-16T10:00:00.000Z"),
    });

    expect(result.id).toBe("ann-5");
    expect(
      mockNotificationEventService.broadcastAnnouncementPublished,
    ).toHaveBeenCalledTimes(1);
  });

  it("preserves existing not-found behavior on update", async () => {
    mockPrisma.announcement.findUnique.mockResolvedValue(null);

    await expect(
      service.update("missing", { isActive: true }),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(
      mockNotificationEventService.broadcastAnnouncementPublished,
    ).not.toHaveBeenCalled();
  });
});
