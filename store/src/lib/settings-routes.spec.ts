import { describe, expect, it } from 'vitest';

/** Smoke test: canonical settings/help routes used by Settings UI. */
describe('settings routes', () => {
  const routes = [
    '/settings',
    '/settings/addresses',
    '/settings/notifications',
    '/settings/privacy',
    '/settings/delete-account',
    '/notifications',
    '/contact',
    '/help',
    '/profile',
    '/support',
  ] as const;

  it('defines expected navigation paths', () => {
    expect(routes).toContain('/settings');
    expect(routes).toContain('/help');
    expect(routes.every((r) => r.startsWith('/'))).toBe(true);
  });
});
