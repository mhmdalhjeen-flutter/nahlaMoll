/**
 * Customer notification inbox API (GET /notifications, unread-count, mark-read).
 * Enabled by default; set NEXT_PUBLIC_NOTIFICATIONS_ENABLED=false to disable.
 */
export const NOTIFICATIONS_API_ENABLED =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED !== 'false';

/**
 * Notification preferences API — implemented at GET/PATCH /notifications/preferences.
 */
export const NOTIFICATION_PREFERENCES_API_ENABLED =
  process.env.NEXT_PUBLIC_NOTIFICATION_PREFERENCES_ENABLED !== 'false';

/** Backend delivery channels — must match notifications.service.ts flags. */
export const PUSH_NOTIFICATIONS_SUPPORTED = false;
export const EMAIL_NOTIFICATIONS_SUPPORTED = false;
export const NOTIFICATION_DELIVERY_SCHEDULING_SUPPORTED = false;
