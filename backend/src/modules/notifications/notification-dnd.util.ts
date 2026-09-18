import type { NotificationPreferenceSnapshot } from "./notification-eligibility.util";

function parseTimeMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Returns true when push delivery should be suppressed by the DND window. */
export function isPushBlockedByDoNotDisturb(
  preferences: NotificationPreferenceSnapshot,
  now: Date = new Date(),
): boolean {
  if (!preferences.doNotDisturbEnabled) {
    return false;
  }

  if (!preferences.doNotDisturbFrom || !preferences.doNotDisturbUntil) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const fromMinutes = parseTimeMinutes(preferences.doNotDisturbFrom);
  const untilMinutes = parseTimeMinutes(preferences.doNotDisturbUntil);

  if (fromMinutes <= untilMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes < untilMinutes;
  }

  return currentMinutes >= fromMinutes || currentMinutes < untilMinutes;
}
