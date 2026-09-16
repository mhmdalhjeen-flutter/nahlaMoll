'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, MapPinned } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { useCheckoutStore } from '@/stores/checkout-store';
import { useToastStore } from '@/stores/toast-store';
import { DeliveryAreaSelectionForm } from '@/components/delivery/DeliveryAreaSelectionForm';
import { useState, useEffect } from 'react';

export default function DeliveryAreasPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const saveDefaultDelivery = useCheckoutStore((s) => s.saveDefaultDelivery);
  const storedAreaId = useCheckoutStore((s) => s.deliveryAreaId);
  const storedAddress = useCheckoutStore((s) => s.deliveryAddress);
  const storedNotes = useCheckoutStore((s) => s.deliveryNotes);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(storedAreaId);
  const [address, setAddress] = useState(storedAddress);
  const [notes, setNotes] = useState(storedNotes);
  const [submitting, setSubmitting] = useState(false);

  const { data: areas, isLoading, isError, refetch } = useQuery({
    queryKey: ['delivery-areas'],
    queryFn: storeApi.getDeliveryAreas,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setSelectedAreaId(storedAreaId);
    setAddress(storedAddress);
    setNotes(storedNotes);
  }, [storedAreaId, storedAddress, storedNotes]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  const handleSave = async () => {
    if (!selectedAreaId) {
      toast('يرجى اختيار منطقة التوصيل', 'error');
      return;
    }
    const trimmed = address.trim();
    if (trimmed.length < 5) {
      toast('يرجى إدخال العنوان بالتفصيل', 'error');
      return;
    }
    setSubmitting(true);
    try {
      saveDefaultDelivery({
        deliveryAreaId: selectedAreaId,
        deliveryAddress: trimmed,
        deliveryNotes: notes.trim(),
      });
      await qc.invalidateQueries({ queryKey: ['cart'] });
      toast('تم حفظ عنوان التوصيل الافتراضي', 'success');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-lg">
      <header className="flex items-center gap-2 mb-4 min-h-[44px]">
        <button
          type="button"
          onClick={handleBack}
          className={cn(
            'shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl',
            'text-navy-700 hover:bg-navy-50 transition-colors touch-manipulation',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70',
          )}
          aria-label="رجوع"
        >
          <ArrowRight className="w-5 h-5" aria-hidden />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <MapPinned className="w-5 h-5 shrink-0 text-primary-600" aria-hidden />
          <h1 className="text-xl font-bold text-navy-900 truncate">مناطق التوصيل</h1>
        </div>
      </header>

      <p className="text-sm text-gray-600 mb-5 leading-relaxed">
        نوصل طلباتك إلى المناطق التالية — اختر منطقتك واحفظ عنوانك الافتراضي
      </p>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center space-y-3">
          <p className="text-sm text-gray-600">تعذّر تحميل مناطق التوصيل</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-semibold text-primary-700 hover:underline min-h-[44px] px-3"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <DeliveryAreaSelectionForm
            areas={areas ?? []}
            selectedAreaId={selectedAreaId}
            onSelectArea={setSelectedAreaId}
            address={address}
            onAddressChange={setAddress}
            notes={notes}
            onNotesChange={setNotes}
            listMaxHeightClass="max-h-none"
          />
          <Button
            className="w-full min-h-[48px] btn-cta"
            onClick={handleSave}
            loading={submitting}
          >
            تأكيد
          </Button>
        </div>
      )}
    </div>
  );
}
