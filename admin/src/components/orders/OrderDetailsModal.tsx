'use client';

import { Modal } from '@/components/ui/Modal';
import { OrderDetailsContent } from '@/components/orders/OrderDetailsContent';
import type { Order } from '@/lib/types';
import { formatCustomerOrderNumber } from '@/lib/order-number';
import { OrderBadge, PaymentBadge } from '@/components/ui/StatusBadge';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  const created = new Date(order.createdAt).toLocaleString('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={`طلب ${formatCustomerOrderNumber(order.orderNumber)}`}
      subtitle={created}
      size="lg"
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <OrderBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <OrderDetailsContent order={order} compactHeader />
    </Modal>
  );
}
