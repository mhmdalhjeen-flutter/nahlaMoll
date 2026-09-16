'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import {
  CUSTOMER_ORDER_TABS,
  countOrdersByCustomerTab,
  getCustomerOrderTab,
  hasOrderReviewRequest,
  type CustomerOrderTab,
} from '@/lib/customer-order-ui';
import { CustomerOrderCard } from '@/components/orders/CustomerOrderCard';
import { OrdersPageSkeleton } from '@/components/orders/OrdersPageSkeleton';
import { cn } from '@/lib/utils';

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}

function OrdersContent() {
  const [tab, setTab] = useState<CustomerOrderTab>('waiting');

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: () => storeApi.getOrders({ limit: 100 }),
  });

  const { data: supportMessages } = useQuery({
    queryKey: ['support-messages'],
    queryFn: storeApi.getSupportMessages,
  });

  const orders = useMemo(() => data?.items ?? [], [data]);

  const counts = useMemo(() => countOrdersByCustomerTab(orders), [orders]);

  const visible = useMemo(
    () => orders.filter((o) => getCustomerOrderTab(o) === tab),
    [orders, tab],
  );

  const reviewSubmittedMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!supportMessages) return map;
    for (const order of orders) {
      map.set(order.id, hasOrderReviewRequest(supportMessages, order.id));
    }
    return map;
  }, [orders, supportMessages]);

  if (isLoading) {
    return <OrdersPageSkeleton />;
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <ErrorState message="تعذر تحميل طلباتك" onRetry={() => refetch()} />
      </div>
    );
  }

  const isEmpty = orders.length === 0;

  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">طلباتي</h1>

      {!isEmpty && (
        <div
          className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1"
          role="tablist"
          aria-label="تصنيف الطلبات"
        >
          {CUSTOMER_ORDER_TABS.map((item) => {
            const active = tab === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  'shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition-colors border',
                  active
                    ? 'bg-primary-500 text-gray-900 border-primary-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-200 hover:text-primary-700',
                )}
              >
                {item.label}
                {count > 0 && (
                  <span className="mr-1.5 tabular-nums" aria-label={`${count} طلب`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isEmpty ? (
        <div className="empty-state py-16">
          <p className="text-4xl mb-3" aria-hidden>
            🛍️
          </p>
          <p className="text-lg font-bold text-gray-900 mb-1">لسه ما عندك طلبات</p>
          <p className="text-sm text-gray-500 mb-6">أول طلب إلك بانتظارك ❤️</p>
          <Link href="/">
            <Button type="button" className="btn-cta min-h-[48px] px-8">
              ابدأ التسوق
            </Button>
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state py-12">
          <p className="text-lg font-medium text-gray-700 mb-1">لا توجد طلبات في هذا القسم</p>
          <p className="text-sm text-gray-500">
            {tab === 'waiting'
              ? 'الطلبات النشطة ستظهر هنا'
              : tab === 'delivered'
                ? 'الطلبات المسلّمة ستظهر هنا'
                : 'الطلبات غير المكتملة ستظهر هنا'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => (
            <CustomerOrderCard
              key={order.id}
              order={order}
              reviewSubmitted={reviewSubmittedMap.get(order.id) ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
