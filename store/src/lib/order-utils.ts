export type { CustomerOrderTab as OrderListTab } from './customer-order-ui';
export { getCustomerOrderTab as getOrderListTab } from './customer-order-ui';

import type { Order } from './types';

const ACTIVE = new Set([
  'PENDING',
  'PAYMENT_SUBMITTED',
  'PAYMENT_VERIFIED',
  'PAYMENT_REJECTED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
]);

const CANCELLABLE = new Set(['PENDING', 'PAYMENT_REJECTED', 'CONFIRMED']);

const DELETABLE = new Set(['DELIVERED', 'CANCELLED']);

export function isActiveOrder(order: Order): boolean {
  return ACTIVE.has(order.status);
}

export function canCustomerCancelOrder(order: Order): boolean {
  return CANCELLABLE.has(order.status);
}

export function canDeleteOrder(order: Order): boolean {
  return DELETABLE.has(order.status);
}

export function isCashOnDeliveryOrder(order: Order): boolean {
  if (order.paymentReference?.trim()) return false;
  if (order.paymentStatus === 'SUBMITTED') return false;
  if (order.status === 'PAYMENT_SUBMITTED') return false;
  return order.paymentStatus === 'PENDING' || order.paymentStatus === 'REJECTED';
}

export function getOrderStatusTone(
  status: string,
): 'neutral' | 'warning' | 'success' | 'danger' | 'info' {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
    case 'PAYMENT_REJECTED':
      return 'danger';
    case 'PAYMENT_SUBMITTED':
    case 'PROCESSING':
    case 'SHIPPED':
      return 'info';
    case 'PENDING':
    case 'CONFIRMED':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getPaymentStatusTone(
  status: string,
): 'neutral' | 'warning' | 'success' | 'danger' | 'info' {
  switch (status) {
    case 'VERIFIED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'SUBMITTED':
      return 'info';
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
}
