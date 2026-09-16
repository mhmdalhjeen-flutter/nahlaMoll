import type { Order } from '@/lib/types';

export type OrderWorkflowTab = 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';

export const ORDER_TABS: {
  id: OrderWorkflowTab;
  label: string;
  sectionTitle: string;
  icon: 'clock' | 'package' | 'truck' | 'check' | 'x';
}[] = [
  { id: 'pending', label: 'بانتظار التأكيد', sectionTitle: 'طلبات بانتظار التأكيد', icon: 'clock' },
  { id: 'processing', label: 'قيد التجهيز', sectionTitle: 'قيد التجهيز', icon: 'package' },
  { id: 'shipping', label: 'في التوصيل', sectionTitle: 'في التوصيل', icon: 'truck' },
  { id: 'delivered', label: 'تم التسليم', sectionTitle: 'تم التسليم', icon: 'check' },
  { id: 'cancelled', label: 'ملغاة', sectionTitle: 'طلبات ملغاة', icon: 'x' },
];

const TAB_STATUSES: Record<OrderWorkflowTab, string[]> = {
  pending: ['PENDING', 'PAYMENT_SUBMITTED', 'CONFIRMED', 'PAYMENT_REJECTED'],
  processing: ['PROCESSING'],
  shipping: ['SHIPPED'],
  delivered: ['DELIVERED'],
  cancelled: ['CANCELLED'],
};

export const WORKFLOW_NEXT_STATUS: Partial<Record<string, string>> = {
  PENDING: 'PROCESSING',
  PAYMENT_SUBMITTED: 'PROCESSING',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

export const WORKFLOW_ACTION_LABEL: Partial<Record<string, string>> = {
  PENDING: 'تأكيد الطلب',
  PAYMENT_SUBMITTED: 'تأكيد الطلب',
  CONFIRMED: 'تأكيد الطلب',
  PROCESSING: 'تم تجهيز الطلب',
  SHIPPED: 'تم التسليم',
};

export const WORKFLOW_NOTIFY_MESSAGE: Partial<Record<string, string>> = {
  PROCESSING: 'تم تأكيد طلبك، وجاري تجهيز الطلب.',
  SHIPPED: 'تم تجهيز طلبك، وسيتم توصيله إليك.',
  DELIVERED: 'تم تسليم طلبك بنجاح.',
  CANCELLED: 'تم إلغاء طلبك من قبل الإدارة.',
};

export function getOrdersForTab(orders: Order[], tab: OrderWorkflowTab): Order[] {
  const statuses = TAB_STATUSES[tab];
  return orders.filter((o) => statuses.includes(o.status));
}

export function countOrdersByTab(orders: Order[]): Record<OrderWorkflowTab, number> {
  return {
    pending: getOrdersForTab(orders, 'pending').length,
    processing: getOrdersForTab(orders, 'processing').length,
    shipping: getOrdersForTab(orders, 'shipping').length,
    delivered: getOrdersForTab(orders, 'delivered').length,
    cancelled: getOrdersForTab(orders, 'cancelled').length,
  };
}

export function canDeleteOrder(order: Order): boolean {
  return order.status === 'DELIVERED' || order.status === 'CANCELLED';
}

export function inferPaymentMethodLabel(order: Order): string {
  if (order.paymentReference?.trim()) {
    return 'دفع إلكتروني';
  }
  if (order.paymentStatus === 'REJECTED') {
    return 'دفع إلكتروني (مرفوض)';
  }
  if (
    order.paymentStatus === 'PENDING' ||
    (order.status === 'DELIVERED' && order.paymentStatus === 'VERIFIED' && !order.paymentReference)
  ) {
    return 'الدفع عند التوصيل';
  }
  if (order.paymentStatus === 'SUBMITTED' || order.paymentStatus === 'VERIFIED') {
    return 'دفع إلكتروني';
  }
  return 'غير محدد';
}

export function canConfirmOrder(order: Order): boolean {
  return ['PENDING', 'CONFIRMED', 'PAYMENT_SUBMITTED'].includes(order.status);
}

export function canAdminCancelOrder(order: Order): boolean {
  return ['PENDING', 'CONFIRMED', 'PAYMENT_SUBMITTED', 'PAYMENT_REJECTED'].includes(order.status);
}

export function getPrimaryAction(order: Order): { label: string; nextStatus: string } | null {
  if (order.status === 'PROCESSING') {
    return { label: 'تم تجهيز الطلب', nextStatus: 'SHIPPED' };
  }
  if (order.status === 'SHIPPED') {
    return { label: 'تم التسليم', nextStatus: 'DELIVERED' };
  }
  if (canConfirmOrder(order)) {
    return { label: 'تأكيد الطلب', nextStatus: 'PROCESSING' };
  }
  return null;
}

export function computeDiscount(order: Order): number {
  const sub = parseFloat(String(order.subtotal));
  const fee = parseFloat(String(order.deliveryFee));
  const total = parseFloat(String(order.total));
  const diff = sub + fee - total;
  return diff > 0.009 ? diff : 0;
}
