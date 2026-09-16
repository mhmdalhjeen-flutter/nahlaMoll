import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/cart',
}));

vi.mock('@/hooks/useCartMap', () => ({
  useCartMap: () => ({ summary: { totalItems: 3 } }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ isAuthenticated: true }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { MobileBottomNav, mobileBottomNavItems } from './MobileBottomNav';

describe('mobileBottomNavItems', () => {
  it('defines exactly five destinations', () => {
    expect(mobileBottomNavItems).toHaveLength(5);
  });

  it('uses RTL visual order with الرئيسية first (far right)', () => {
    expect(mobileBottomNavItems.map((item) => item.label)).toEqual([
      'الرئيسية',
      'الأقسام',
      'السلة',
      'طلباتي',
      'حسابي',
    ]);
  });

  it('maps to existing application routes', () => {
    expect(mobileBottomNavItems.map((item) => item.href)).toEqual([
      '/',
      '/categories',
      '/cart',
      '/orders',
      '/profile',
    ]);
  });

  it('identifies the cart item for badge display', () => {
    expect(mobileBottomNavItems.filter((item) => item.isCart)).toHaveLength(1);
    expect(mobileBottomNavItems.find((item) => item.isCart)?.href).toBe('/cart');
  });
});

describe('MobileBottomNav', () => {
  it('renders five navigation links', () => {
    const html = renderToStaticMarkup(<MobileBottomNav />);
    expect(html.match(/href="/g)?.length).toBe(5);
  });

  it('shows cart badge when cart has items', () => {
    const html = renderToStaticMarkup(<MobileBottomNav />);
    expect(html).toContain('data-testid="mobile-nav-cart-badge"');
    expect(html).toContain('>3<');
  });

  it('highlights active route with brand styling', () => {
    const html = renderToStaticMarkup(<MobileBottomNav />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('text-primary-700');
    expect(html).toContain('bg-primary-50');
  });

  it('uses navy for cart badge', () => {
    const html = renderToStaticMarkup(<MobileBottomNav />);
    expect(html).toContain('bg-navy-600');
  });

  it('does not use exaggerated cart protrusion', () => {
    const html = renderToStaticMarkup(<MobileBottomNav />);
    expect(html).not.toContain('rounded-t-full');
  });
});
