'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { Button } from '@/components/ui/Button';
import { storeApi } from '@/lib/store-api';
import { useCheckoutStore } from '@/stores/checkout-store';
import { useToastStore } from '@/stores/toast-store';
import { Skeleton } from '@/components/ui/Skeleton';
import { DeliveryAreaSelectionForm } from '@/components/delivery/DeliveryAreaSelectionForm';

export default function SettingsAddressesPage() {
  return (
    <AuthGuard>
      <AddressesContent />
    </AuthGuard>
  );
}

function AddressesContent() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const saveDefaultDelivery = useCheckoutStore((s) => s.saveDefaultDelivery);
  const storedAreaId = useCheckoutStore((s) => s.deliveryAreaId);
  const storedAddress = useCheckoutStore((s) => s.deliveryAddress);
  const storedNotes = useCheckoutStore((s) => s.deliveryNotes);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(storedAreaId);
  const [address, setAddress] = useState(storedAddress);
  const [notes, setNotes] = useState(storedNotes);

  const { data: areas, isLoading } = useQuery({
    queryKey: ['delivery-areas'],
    queryFn: storeApi.getDeliveryAreas,
  });

  useEffect(() => {
    setSelectedAreaId(storedAreaId);
    setAddress(storedAddress);
    setNotes(storedNotes);
  }, [storedAreaId, storedAddress, storedNotes]);

  const handleSave = () => {
    if (!selectedAreaId) {
      toast('يرجى اختيار منطقة التوصيل', 'error');
      return;
    }
    const trimmed = address.trim();
    if (trimmed.length < 5) {
      toast('يرجى إدخال العنوان بالتفصيل (5 أحرف على الأقل)', 'error');
      return;
    }
    saveDefaultDelivery({
      deliveryAreaId: selectedAreaId,
      deliveryAddress: trimmed,
      deliveryNotes: notes.trim(),
    });
    void qc.invalidateQueries({ queryKey: ['cart'] });
    toast('تم حفظ عنوان التوصيل', 'success');
  };

  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-lg">
      <SettingsHeader title="عناويني" backHref="/settings" />

      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        يُستخدم هذا العنوان في السلة والدفع. إدارة العناوين المتعددة غير متاحة حاليًا في النظام.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <DeliveryAreaSelectionForm
              areas={areas ?? []}
              selectedAreaId={selectedAreaId}
              onSelectArea={setSelectedAreaId}
              address={address}
              onAddressChange={setAddress}
              notes={notes}
              onNotesChange={setNotes}
              listMaxHeightClass="max-h-64"
            />
          </div>

          <Button type="button" className="w-full min-h-[48px] btn-cta" onClick={handleSave}>
            حفظ العنوان
          </Button>
        </div>
      )}
    </div>
  );
}
