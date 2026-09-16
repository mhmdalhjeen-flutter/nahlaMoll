'use client';

import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StoreClosedBanner({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ['store-status'],
    queryFn: storeApi.getStoreStatus,
    staleTime: 60_000,
  });

  if (!data || data.isOpen) return null;

  return (
    <div className={cn('bg-warning-50 border border-warning-100 text-warning-600 px-4 py-3 flex items-start gap-2', className)}>
      <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">المتجر مغلق حالياً</p>
        {data.message && <p className="text-sm mt-0.5">{data.message}</p>}
      </div>
    </div>
  );
}

export function useStoreOpen() {
  const { data, isLoading } = useQuery({
    queryKey: ['store-status'],
    queryFn: storeApi.getStoreStatus,
    staleTime: 60_000,
  });
  return { isOpen: data?.isOpen ?? true, message: data?.message, isLoading };
}

export function StoreClosedAlert() {
  const { isOpen, message } = useStoreOpen();
  if (isOpen) return null;
  return (
    <div className="flex items-center gap-2 text-warning-600 bg-warning-50 rounded-xl p-3 text-sm mb-4">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        {message ||
          'المتجر مغلق حالياً — يمكنك التسوق وتجهيز طلبك، وسيتم التحقق عند تأكيد الإرسال.'}
      </span>
    </div>
  );
}
