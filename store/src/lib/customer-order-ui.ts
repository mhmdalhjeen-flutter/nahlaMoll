import type { Order, OrderStatus, SupportMessage } from './types';
import { canCustomerCancelOrder, isCashOnDeliveryOrder } from './order-utils';

/** Customer orders list tabs (RTL order). */
export type CustomerOrderTab = 'waiting' | 'delivered' | 'incomplete';

export const CUSTOMER_ORDER_TABS: { id: CustomerOrderTab; label: string }[] = [
  { id: 'waiting', label: 'المنتظرة' },
  { id: 'delivered', label: 'المسلّمة' },
  { id: 'incomplete', label: 'غير المكتملة' },
];

const INCOMPLETE_STATUSES = new Set<OrderStatus>(['CANCELLED', 'PAYMENT_REJECTED']);

export function getCustomerOrderTab(order: Order): CustomerOrderTab {
  if (order.status === 'DELIVERED') return 'delivered';
  if (INCOMPLETE_STATUSES.has(order.status)) return 'incomplete';
  return 'waiting';
}

export function countOrdersByCustomerTab(
  orders: Order[],
): Record<CustomerOrderTab, number> {
  return {
    waiting: orders.filter((o) => getCustomerOrderTab(o) === 'waiting').length,
    delivered: orders.filter((o) => getCustomerOrderTab(o) === 'delivered').length,
    incomplete: orders.filter((o) => getCustomerOrderTab(o) === 'incomplete').length,
  };
}

export type CustomerStatusTone = 'warning' | 'info' | 'success' | 'danger' | 'neutral';

export interface CustomerOrderStatusView {
  label: string;
  helper: string;
  tone: CustomerStatusTone;
  showProgress: boolean;
}

export function getCustomerOrderStatus(order: Order): CustomerOrderStatusView {
  switch (order.status) {
    case 'PENDING':
    case 'PAYMENT_SUBMITTED':
      return {
        label: 'قيد المراجعة',
        helper: 'طلبك قيد المراجعة، وسنبدأ بتجهيزه بعد تأكيد الطلب.',
        tone: 'warning',
        showProgress: true,
      };
    case 'PAYMENT_VERIFIED':
    case 'CONFIRMED':
    case 'PROCESSING':
      return {
        label: 'تم التأكيد — جاري التجهيز',
        helper: 'تم تأكيد طلبك وبدأنا بتجهيزه.',
        tone: 'info',
        showProgress: true,
      };
    case 'SHIPPED':
      return {
        label: 'الطلب في الطريق إليك',
        helper: 'تم تجهيز طلبك وهو الآن في الطريق إليك.',
        tone: 'info',
        showProgress: true,
      };
    case 'DELIVERED':
      return {
        label: 'تم التسليم',
        helper: 'تم تسليم طلبك بنجاح.',
        tone: 'success',
        showProgress: false,
      };
    case 'PAYMENT_REJECTED': {
      const reason = order.adminPaymentNotes?.trim();
      return {
        label: 'لم يتم قبول الطلب',
        helper: reason
          ? `السبب: ${reason}`
          : 'لم يتم قبول الطلب. يمكنك مراجعة الطلب للتواصل مع المتجر.',
        tone: 'danger',
        showProgress: false,
      };
    }
    case 'CANCELLED':
      return {
        label: 'ملغي / مرفوض',
        helper: order.adminPaymentNotes?.trim()
          ? `السبب: ${order.adminPaymentNotes.trim()}`
          : 'لم يتم قبول هذا الطلب.',
        tone: 'neutral',
        showProgress: false,
      };
    default:
      return {
        label: order.status,
        helper: '',
        tone: 'neutral',
        showProgress: false,
      };
  }
}

export const ORDER_PROGRESS_STEPS = [
  'قيد المراجعة',
  'تم التأكيد',
  'في التجهيز',
  'في الطريق',
  'تم التسليم',
] as const;

/** Current step index (0–4), or -1 when progress should not render. */
export function getOrderProgressIndex(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
    case 'PAYMENT_SUBMITTED':
      return 0;
    case 'PAYMENT_VERIFIED':
    case 'CONFIRMED':
      return 1;
    case 'PROCESSING':
      return 2;
    case 'SHIPPED':
      return 3;
    case 'DELIVERED':
      return 4;
    default:
      return -1;
  }
}

export function getOrderItemCount(order: Order): number {
  return order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function formatOrderDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getOrderPaymentMethodLabel(order: Order): string {
  if (isCashOnDeliveryOrder(order)) {
    return '💵 الدفع عند التوصيل';
  }
  if (order.paymentNotes?.trim()) {
    return `💳 ${order.paymentNotes.trim()}`;
  }
  if (order.paymentReference?.trim()) {
    return '💳 دفع إلكتروني';
  }
  return '💳 دفع إلكتروني';
}

export function isOrderFreeDelivery(order: Order): boolean {
  return Number(order.deliveryFee) === 0;
}

export type CustomerOrderAction = 'view' | 'cancel' | 'review';

export interface CustomerOrderActions {
  primary: CustomerOrderAction;
  secondary: CustomerOrderAction[];
}

/** Actions backed by existing APIs only. */
export function getCustomerOrderActions(order: Order): CustomerOrderActions {
  if (order.status === 'DELIVERED') {
    return { primary: 'review', secondary: [] };
  }
  if (order.status === 'CANCELLED') {
    return { primary: 'view', secondary: [] };
  }
  if (order.status === 'PAYMENT_REJECTED') {
    return { primary: 'review', secondary: [] };
  }

  const secondary: CustomerOrderAction[] = [];
  if (canCustomerCancelOrder(order)) {
    secondary.push('cancel');
  }

  return { primary: 'view', secondary };
}

export function getCustomerOrderActionLabel(action: CustomerOrderAction): string {
  switch (action) {
    case 'view':
      return 'عرض الطلب';
    case 'cancel':
      return 'إلغاء الطلب';
    case 'review':
      return '⭐ مراجعة الطلب';
    default:
      return action;
  }
}

export function hasOrderReviewRequest(
  messages: SupportMessage[],
  orderId: string,
): boolean {
  return messages.some((m) => !m.isAdmin && m.orderId === orderId);
}

export function parseVariantLabel(variantInfo?: string | null): string | null {
  if (!variantInfo) return null;
  try {
    const parsed = JSON.parse(variantInfo) as { name?: string };
    return parsed.name?.trim() || null;
  } catch {
    return null;
  }
}
