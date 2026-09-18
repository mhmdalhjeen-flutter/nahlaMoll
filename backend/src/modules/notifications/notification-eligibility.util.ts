import { NotificationEventType } from "@prisma/client";

export interface NotificationPreferenceSnapshot {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  orderUpdates: boolean;
  abuAlaaNews: boolean;
  doNotDisturbEnabled: boolean;
  doNotDisturbFrom: string | null;
  doNotDisturbUntil: string | null;
}

export function isCategoryAllowedForEvent(
  eventType: NotificationEventType,
  preferences: NotificationPreferenceSnapshot,
): boolean {
  switch (eventType) {
    case NotificationEventType.ORDER_CONFIRMED:
    case NotificationEventType.ORDER_SHIPPED:
    case NotificationEventType.ORDER_DELIVERED:
    case NotificationEventType.ORDER_REJECTED:
    case NotificationEventType.SUPPORT_REPLY:
      return preferences.orderUpdates;
    case NotificationEventType.NEW_ANNOUNCEMENT:
      return preferences.abuAlaaNews;
    default:
      return false;
  }
}

/**
 * Eligibility is frozen at notification creation time.
 * Later preference changes do not retroactively alter existing rows.
 */
export function resolveInAppEligible(
  eventType: NotificationEventType,
  preferences: NotificationPreferenceSnapshot,
): boolean {
  return (
    preferences.inAppEnabled && isCategoryAllowedForEvent(eventType, preferences)
  );
}

/** Eligibility is frozen at notification creation time. DND affects push only. */
export function resolvePushEligible(
  eventType: NotificationEventType,
  preferences: NotificationPreferenceSnapshot,
  pushSupported: boolean,
): boolean {
  if (!pushSupported) {
    return false;
  }

  if (!preferences.pushEnabled) {
    return false;
  }

  return isCategoryAllowedForEvent(eventType, preferences);
}
