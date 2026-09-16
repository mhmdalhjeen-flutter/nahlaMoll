'use client';

import { CheckCircle2, Clock, Package, Truck, XCircle } from 'lucide-react';
import type { OrderWorkflowTab } from '@/lib/order-workflow';
import { ORDER_TABS } from '@/lib/order-workflow';

const ICONS = {
  clock: Clock,
  package: Package,
  truck: Truck,
  check: CheckCircle2,
  x: XCircle,
};

interface OrderStatusTabsProps {
  active: OrderWorkflowTab;
  counts: Record<OrderWorkflowTab, number>;
  onChange: (tab: OrderWorkflowTab) => void;
}

export function OrderStatusTabs({ active, counts, onChange }: OrderStatusTabsProps) {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-wrap gap-2">
        {ORDER_TABS.map((tab) => {
          const Icon = ICONS[tab.icon];
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 min-h-[52px] text-sm font-semibold transition-all w-full xl:w-auto xl:shrink-0 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold min-w-[1.5rem] text-center shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
