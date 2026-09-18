export interface WebPushPayload {
  notificationId: string;
  title: string;
  message: string;
  targetType: string;
  targetId: string | null;
  url: string | null;
}

export interface PushNotificationData {
  notificationId: string;
  targetType: string;
  targetId: string | null;
  url: string | null;
}

export const PUSH_NOTIFICATION_ICON = '/icons/icon-192.png';
export const PUSH_NOTIFICATION_BADGE = '/icons/icon-192.png';

const BLOCKED_URL_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

/** Parse Phase 8 push JSON payload; returns null when malformed. */
export function parsePushPayloadText(
  text: string | null | undefined,
): WebPushPayload | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const notificationId =
      typeof record.notificationId === 'string'
        ? record.notificationId.trim()
        : '';
    const title =
      typeof record.title === 'string' ? record.title.trim() : '';
    const message =
      typeof record.message === 'string' ? record.message.trim() : '';

    if (!notificationId || !title || !message) {
      return null;
    }

    return {
      notificationId,
      title,
      message,
      targetType:
        typeof record.targetType === 'string' ? record.targetType : '',
      targetId:
        typeof record.targetId === 'string' ? record.targetId : null,
      url: typeof record.url === 'string' ? record.url : null,
    };
  } catch {
    return null;
  }
}

export function buildShowNotificationOptions(
  payload: WebPushPayload,
): NotificationOptions & { data: PushNotificationData } {
  return {
    body: payload.message,
    icon: PUSH_NOTIFICATION_ICON,
    badge: PUSH_NOTIFICATION_BADGE,
    dir: 'rtl',
    lang: 'ar',
    tag: payload.notificationId,
    data: {
      notificationId: payload.notificationId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      url: payload.url,
    },
  };
}

/** Defensive same-origin check for notification deep links. */
export function isSafeInternalUrl(url: string, origin: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (BLOCKED_URL_PROTOCOLS.some((protocol) => lower.startsWith(protocol))) {
    return false;
  }

  if (trimmed.startsWith('//')) {
    return false;
  }

  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//');
  }

  try {
    return new URL(trimmed, origin).origin === origin;
  } catch {
    return false;
  }
}

export function resolveSafeNavigationUrl(
  url: string | null | undefined,
  origin: string,
): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  if (!isSafeInternalUrl(url, origin)) {
    return null;
  }

  if (url.startsWith('/')) {
    return `${origin}${url}`;
  }

  try {
    const parsed = new URL(url, origin);
    if (parsed.origin !== origin) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export interface WindowClientLike {
  url: string;
  focus?: () => Promise<WindowClientLike>;
  navigate?: (url: string) => Promise<WindowClientLike | null>;
}

export interface NotificationClientsLike {
  matchAll: (options: {
    type: 'window';
    includeUncontrolled: boolean;
  }) => Promise<WindowClientLike[]>;
  openWindow: (url: string) => Promise<WindowClientLike | null>;
}

export function pickClientForNavigation(
  clients: WindowClientLike[],
  origin: string,
): WindowClientLike | null {
  for (const client of clients) {
    try {
      if (new URL(client.url).origin === origin) {
        return client;
      }
    } catch {
      // Ignore malformed client URLs.
    }
  }
  return null;
}

export function clientNeedsNavigation(
  clientUrl: string,
  targetUrl: string,
): boolean {
  try {
    const client = new URL(clientUrl);
    const target = new URL(targetUrl);
    return (
      client.pathname + client.search + client.hash !==
      target.pathname + target.search + target.hash
    );
  } catch {
    return true;
  }
}

export async function openNotificationTarget(options: {
  clients: NotificationClientsLike;
  origin: string;
  url: string | null | undefined;
}): Promise<'opened' | 'focused' | 'skipped'> {
  const targetUrl = resolveSafeNavigationUrl(options.url, options.origin);
  if (!targetUrl) {
    return 'skipped';
  }

  const windowClients = await options.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  const existing = pickClientForNavigation(windowClients, options.origin);

  if (existing) {
    await existing.focus?.();
    if (
      clientNeedsNavigation(existing.url, targetUrl) &&
      existing.navigate
    ) {
      await existing.navigate(targetUrl);
    }
    return 'focused';
  }

  await options.clients.openWindow(targetUrl);
  return 'opened';
}
