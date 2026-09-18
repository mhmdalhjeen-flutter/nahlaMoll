import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAnnouncementDto } from "./dtos/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dtos/update-announcement.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exception";
import { NotificationEventService } from "../notifications/notification-event.service";
import { isAnnouncementPublished } from "./announcement-published.util";

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private notificationEventService: NotificationEventService,
  ) {}

  async findActivePublic() {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: [{ priority: "desc" }, { startDate: "desc" }],
    });
  }

  async findAllAdmin() {
    return this.prisma.announcement.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!announcement) {
      throw new ResourceNotFoundException("Announcement", id);
    }
    return announcement;
  }

  async create(dto: CreateAnnouncementDto) {
    const created = await this.prisma.announcement.create({ data: dto });

    if (isAnnouncementPublished(created)) {
      void this.notificationEventService.broadcastAnnouncementPublished({
        announcementId: created.id,
        announcementMessage: created.content,
      });
    }

    return created;
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: dto,
    });

    const wasPublished = isAnnouncementPublished(existing);
    const isPublished = isAnnouncementPublished(updated);

    if (!wasPublished && isPublished) {
      void this.notificationEventService.broadcastAnnouncementPublished({
        announcementId: updated.id,
        announcementMessage: updated.content,
      });
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.announcement.delete({ where: { id } });
    return { removed: true };
  }
}
