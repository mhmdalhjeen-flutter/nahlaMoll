import { PrismaService } from "../prisma/prisma.service";
import { NOTIFICATION_PREFERENCE_DEFAULTS } from "./notification-preferences.constants";
import type { NotificationPreferenceSnapshot } from "./notification-eligibility.util";

export async function ensureNotificationPreferences(
  prisma: PrismaService,
  userId: string,
): Promise<NotificationPreferenceSnapshot & { updatedAt: Date }> {
  return prisma.customerNotificationPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...NOTIFICATION_PREFERENCE_DEFAULTS,
    },
    update: {},
    select: {
      inAppEnabled: true,
      pushEnabled: true,
      orderUpdates: true,
      abuAlaaNews: true,
      doNotDisturbEnabled: true,
      doNotDisturbFrom: true,
      doNotDisturbUntil: true,
      updatedAt: true,
    },
  });
}
