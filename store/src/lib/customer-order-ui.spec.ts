import { describe, expect, it } from 'vitest';
import type { Order } from './types';
import {
  countOrdersByCustomerTab,
  getCustomerOrderActions,
  getCustomerOrderStatus,
  getCustomerOrderTab,
  getOrderProgressIndex,
  hasOrderReviewRequest,
} from './customer-order-ui';

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNumber: '10254',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    subtotal: 95,
    deliveryFee: 0,
    total: 95,
    cartScore: 5,
    deliveryAreaId: 'a1',
    deliveryAddress: 'شارع 1',
    createdAt: '2026-09-04T10:30:00.000Z',
    items: [{ id: 'i1', productId: 'p1', productName: 'منتج', quantity: 2, price: 40, freeDeliveryValue: 1 }],
    ...overrides,
  };
}

describe('customer-order-ui', () => {
  it('maps tabs from backend statuses', () => {
    expect(getCustomerOrderTab(baseOrder({ status: 'PROCESSING' }))).toBe('waiting');
    expect(getCustomerOrderTab(baseOrder({ status: 'DELIVERED' }))).toBe('delivered');
    expect(getCustomerOrderTab(baseOrder({ status: 'CANCELLED' }))).toBe('incomplete');
    expect(getCustomerOrderTab(baseOrder({ status: 'PAYMENT_REJECTED' }))).toBe('incomplete');
  });

  it('counts orders per tab', () => {
    const orders = [
      baseOrder({ id: '1', status: 'PENDING' }),
      baseOrder({ id: '2', status: 'DELIVERED' }),
      baseOrder({ id: '3', status: 'CANCELLED' }),
    ];
    expect(countOrdersByCustomerTab(orders)).toEqual({
      waiting: 1,
      delivered: 1,
      incomplete: 1,
    });
  });

  it('uses friendly Arabic status labels', () => {
    expect(getCustomerOrderStatus(baseOrder()).label).toBe('قيد المراجعة');
    expect(getCustomerOrderStatus(baseOrder({ status: 'SHIPPED' })).label).toBe(
      'الطلب في الطريق إليك',
    );
    expect(getCustomerOrderStatus(baseOrder({ status: 'PAYMENT_REJECTED' })).label).toBe(
      'لم يتم قبول الطلب',
    );
  });

  it('shows admin rejection reason when provided', () => {
    const view = getCustomerOrderStatus(
      baseOrder({
        status: 'PAYMENT_REJECTED',
        adminPaymentNotes: 'أحد المنتجات غير متوفر حاليًا',
      }),
    );
    expect(view.helper).toContain('أحد المنتجات غير متوفر حاليًا');
  });

  it('maps progress index from backend status', () => {
    expect(getOrderProgressIndex('PENDING')).toBe(0);
    expect(getOrderProgressIndex('CONFIRMED')).toBe(1);
    expect(getOrderProgressIndex('PROCESSING')).toBe(2);
    expect(getOrderProgressIndex('SHIPPED')).toBe(3);
    expect(getOrderProgressIndex('CANCELLED')).toBe(-1);
  });

  it('exposes cancel only when backend allows it', () => {
    expect(getCustomerOrderActions(baseOrder()).secondary).toContain('cancel');
    expect(getCustomerOrderActions(baseOrder({ status: 'SHIPPED' })).secondary).not.toContain(
      'cancel',
    );
  });

  it('offers review action for delivered orders', () => {
    expect(getCustomerOrderActions(baseOrder({ status: 'DELIVERED' })).primary).toBe('review');
  });

  it('detects existing order review support messages', () => {
    expect(
      hasOrderReviewRequest(
        [{ id: 'm1', subject: 'مراجعة', message: 'مشكلة', isAdmin: false, isRead: false, orderId: 'o1', createdAt: '' }],
        'o1',
      ),
    ).toBe(true);
    expect(
      hasOrderReviewRequest(
        [{ id: 'm1', subject: 'مراجعة', message: 'مشكلة', isAdmin: true, isRead: false, orderId: 'o1', createdAt: '' }],
        'o1',
      ),
    ).toBe(false);
  });
});
