import { describe, expect, it } from 'vitest';
import {
  countOrdersNeedingAttention,
  isSideMenuItemActive,
  sideMenuSections,
} from './side-menu';
import type { Order } from './types';

const baseOrder = (status: Order['status']): Order =>
  ({
    id: '1',
    orderNumber: '1001',
    status,
    paymentStatus: 'PENDING',
    subtotal: 100,
    deliveryFee: 10,
    total: 110,
    cartScore: 0,
    deliveryAreaId: 'a1',
    deliveryAddress: 'address',
    createdAt: new Date().toISOString(),
    items: [],
  }) as Order;

describe('side-menu', () => {
  it('counts orders needing customer attention', () => {
    expect(
      countOrdersNeedingAttention([
        baseOrder('DELIVERED'),
        baseOrder('SHIPPED'),
        baseOrder('PAYMENT_REJECTED'),
      ]),
    ).toBe(2);
  });

  it('marks product section links active using search params', () => {
    const offers = sideMenuSections[0].items.find((item) => item.id === 'offers')!;
    expect(isSideMenuItemActive('/products', offers, 'section=offers')).toBe(true);
    expect(isSideMenuItemActive('/products', offers, 'section=most_ordered')).toBe(false);
  });

  it('marks categories shop link active on category slug pages', () => {
    const shop = sideMenuSections[0].items.find((item) => item.id === 'shop')!;
    expect(isSideMenuItemActive('/categories/fruits', shop)).toBe(true);
  });

  it('includes delivery areas link in help section', () => {
    const help = sideMenuSections.find((section) => section.id === 'help')!;
    const deliveryAreas = help.items.find((item) => item.id === 'delivery-areas');
    expect(deliveryAreas?.href).toBe('/delivery-areas');
    expect(deliveryAreas?.label).toBe('مناطق التوصيل');
    expect(isSideMenuItemActive('/delivery-areas', deliveryAreas!)).toBe(true);
  });
});
