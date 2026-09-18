import { describe, expect, it, vi } from 'vitest';
import {
  buildShowNotificationOptions,
  clientNeedsNavigation,
  isSafeInternalUrl,
  openNotificationTarget,
  parsePushPayloadText,
  pickClientForNavigation,
  PUSH_NOTIFICATION_BADGE,
  PUSH_NOTIFICATION_ICON,
  resolveSafeNavigationUrl,
} from './sw-push';

const ORIGIN = 'https://nahla-mall.example';

describe('sw-push', () => {
  describe('parsePushPayloadText', () => {
    it('parses a valid push payload', () => {
      const payload = parsePushPayloadText(
        JSON.stringify({
          notificationId: 'n-1',
          title: 'تأكيد الطلب',
          message: 'تم تأكيد الطلب وسيتم تجهيزه',
          targetType: 'ORDER',
          targetId: 'order-1',
          url: '/orders/order-1',
        }),
      );

      expect(payload).toEqual({
        notificationId: 'n-1',
        title: 'تأكيد الطلب',
        message: 'تم تأكيد الطلب وسيتم تجهيزه',
        targetType: 'ORDER',
        targetId: 'order-1',
        url: '/orders/order-1',
      });
    });

    it('returns null for malformed payloads without crashing', () => {
      expect(parsePushPayloadText('{bad json')).toBeNull();
      expect(parsePushPayloadText('')).toBeNull();
      expect(parsePushPayloadText(null)).toBeNull();
      expect(
        parsePushPayloadText(JSON.stringify({ title: 'missing fields' })),
      ).toBeNull();
    });
  });

  describe('buildShowNotificationOptions', () => {
    it('uses title/body, RTL options, icons, and preserves data', () => {
      const payload = parsePushPayloadText(
        JSON.stringify({
          notificationId: 'n-2',
          title: 'رد الدعم',
          message: 'تم الرد على رسالتك',
          targetType: 'SUPPORT',
          targetId: null,
          url: '/support',
        }),
      );
      expect(payload).not.toBeNull();

      const options = buildShowNotificationOptions(payload!);

      expect(options.body).toBe('تم الرد على رسالتك');
      expect(options.dir).toBe('rtl');
      expect(options.lang).toBe('ar');
      expect(options.icon).toBe(PUSH_NOTIFICATION_ICON);
      expect(options.badge).toBe(PUSH_NOTIFICATION_BADGE);
      expect(options.tag).toBe('n-2');
      expect(options.data).toEqual({
        notificationId: 'n-2',
        targetType: 'SUPPORT',
        targetId: null,
        url: '/support',
      });
    });
  });

  describe('URL safety', () => {
    it('allows internal relative URLs', () => {
      expect(isSafeInternalUrl('/orders/123', ORIGIN)).toBe(true);
      expect(isSafeInternalUrl('/support', ORIGIN)).toBe(true);
      expect(resolveSafeNavigationUrl('/announcements/1', ORIGIN)).toBe(
        `${ORIGIN}/announcements/1`,
      );
    });

    it('rejects external and dangerous URLs', () => {
      expect(isSafeInternalUrl('https://external-site.com', ORIGIN)).toBe(
        false,
      );
      expect(isSafeInternalUrl('javascript:alert(1)', ORIGIN)).toBe(false);
      expect(isSafeInternalUrl('data:text/html,hi', ORIGIN)).toBe(false);
      expect(isSafeInternalUrl('//evil.example/path', ORIGIN)).toBe(false);
      expect(
        resolveSafeNavigationUrl('https://external-site.com', ORIGIN),
      ).toBeNull();
    });

    it('handles missing URLs safely', () => {
      expect(resolveSafeNavigationUrl(undefined, ORIGIN)).toBeNull();
      expect(resolveSafeNavigationUrl('', ORIGIN)).toBeNull();
    });
  });

  describe('notification click navigation', () => {
    it('reuses an existing same-origin client when possible', async () => {
      const focus = vi.fn().mockResolvedValue(undefined);
      const navigate = vi.fn().mockResolvedValue(undefined);
      const openWindow = vi.fn();

      const result = await openNotificationTarget({
        origin: ORIGIN,
        url: '/orders/order-9',
        clients: {
          matchAll: vi.fn().mockResolvedValue([
            {
              url: `${ORIGIN}/`,
              focus,
              navigate,
            },
          ]),
          openWindow,
        },
      });

      expect(result).toBe('focused');
      expect(focus).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(`${ORIGIN}/orders/order-9`);
      expect(openWindow).not.toHaveBeenCalled();
    });

    it('opens a new window when no matching client exists', async () => {
      const openWindow = vi.fn().mockResolvedValue({ url: `${ORIGIN}/support` });

      const result = await openNotificationTarget({
        origin: ORIGIN,
        url: '/support',
        clients: {
          matchAll: vi.fn().mockResolvedValue([]),
          openWindow,
        },
      });

      expect(result).toBe('opened');
      expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/support`);
    });

    it('skips navigation for missing or rejected URLs', async () => {
      const openWindow = vi.fn();

      const result = await openNotificationTarget({
        origin: ORIGIN,
        url: 'https://evil.example',
        clients: {
          matchAll: vi.fn(),
          openWindow,
        },
      });

      expect(result).toBe('skipped');
      expect(openWindow).not.toHaveBeenCalled();
    });
  });

  describe('client selection helpers', () => {
    it('picks a same-origin client', () => {
      const picked = pickClientForNavigation(
        [
          { url: 'https://other.example/' },
          { url: `${ORIGIN}/notifications` },
        ],
        ORIGIN,
      );

      expect(picked?.url).toBe(`${ORIGIN}/notifications`);
    });

    it('detects when navigation is unnecessary', () => {
      expect(
        clientNeedsNavigation(`${ORIGIN}/orders/1`, `${ORIGIN}/orders/1`),
      ).toBe(false);
      expect(
        clientNeedsNavigation(`${ORIGIN}/`, `${ORIGIN}/orders/1`),
      ).toBe(true);
    });
  });
});
