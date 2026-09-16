import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('@/hooks/useCartMap', () => ({
  useCartMap: () => ({ summary: { totalItems: 0 } }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ isAuthenticated: true }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { MobileBottomNav } from './MobileBottomNav';

describe('MobileBottomNav cart badge (empty)', () => {
  it('hides cart badge when quantity is zero', () => {
    const html = renderToStaticMarkup(<MobileBottomNav />);
    expect(html).not.toContain('data-testid="mobile-nav-cart-badge"');
  });
});
