const SEEN_PREFIX = 'announcement_seen_';

/** Local calendar date key (YYYY-MM-DD) for daily display tracking */
export function getLocalCalendarDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAnnouncementSeenKey(announcementId: string, dateKey = getLocalCalendarDateKey()): string {
  return `${SEEN_PREFIX}${announcementId}_${dateKey}`;
}

export function wasAnnouncementSeenToday(announcementId: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(getAnnouncementSeenKey(announcementId)) === '1';
}

export function markAnnouncementSeenToday(announcementId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getAnnouncementSeenKey(announcementId), '1');
}

export function pickDailyAnnouncement<T extends { id: string }>(announcements: T[]): T | null {
  return announcements.find((item) => !wasAnnouncementSeenToday(item.id)) ?? null;
}
