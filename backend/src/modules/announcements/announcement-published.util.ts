/** Matches findActivePublic semantics — announcement is customer-visible now. */
export function isAnnouncementPublished(
  announcement: {
    isActive: boolean;
    startDate: Date;
    endDate: Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (!announcement.isActive) {
    return false;
  }

  if (announcement.startDate > now) {
    return false;
  }

  if (announcement.endDate !== null && announcement.endDate < now) {
    return false;
  }

  return true;
}
