import { OrderStatus, PaymentStatus } from "@prisma/client";

/** Orders still in progress — block product deletion when referenced. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_SUBMITTED,
  OrderStatus.PAYMENT_VERIFIED,
  OrderStatus.PAYMENT_REJECTED,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
];

/** Orders that are fully closed — product may be deleted if only these reference it. */
export const FINALIZED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

/** Customer may cancel while the order has not entered fulfillment/shipping. */
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_REJECTED,
  OrderStatus.CONFIRMED,
];

/** Admin may cancel while the order awaits confirmation or payment review. */
export const ADMIN_CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_SUBMITTED,
  OrderStatus.CONFIRMED,
  OrderStatus.PAYMENT_REJECTED,
];

export function canAdminCancelOrder(status: OrderStatus): boolean {
  return ADMIN_CANCELLABLE_STATUSES.includes(status);
}

export function isFinalizedOrderStatus(status: OrderStatus): boolean {
  return FINALIZED_ORDER_STATUSES.includes(status);
}

export function canCustomerCancelOrder(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(status);
}

export function canDeleteOrder(status: OrderStatus): boolean {
  return isFinalizedOrderStatus(status);
}

/** Cash on delivery — no electronic transfer reference was ever submitted. */
export function isCashOnDeliveryOrder(order: {
  paymentReference: string | null;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}): boolean {
  if (order.paymentReference?.trim()) {
    return false;
  }
  if (order.paymentStatus === PaymentStatus.SUBMITTED) {
    return false;
  }
  if (
    order.status === OrderStatus.PAYMENT_SUBMITTED ||
    order.status === OrderStatus.PAYMENT_VERIFIED
  ) {
    return false;
  }
  return (
    order.paymentStatus === PaymentStatus.PENDING ||
    order.paymentStatus === PaymentStatus.REJECTED
  );
}
