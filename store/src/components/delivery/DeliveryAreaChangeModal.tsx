'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { DeliveryArea } from '@/lib/types';
import { useCheckoutStore } from '@/stores/checkout-store';
import { useToastStore } from '@/stores/toast-store';
import { DeliveryAreaSelectionForm } from './DeliveryAreaSelectionForm';

interface DeliveryAreaChangeModalProps {
  open: boolean;
  onClose: () => void;
  areas: DeliveryArea[];
  areasLoading?: boolean;
  onConfirmed?: () => void;
}

export function DeliveryAreaChangeModal({
  open,
  onClose,
  areas,
  areasLoading,
  onConfirmed,
}: DeliveryAreaChangeModalProps) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const saveDefaultDelivery = useCheckoutStore((s) => s.saveDefaultDelivery);
  const storedAreaId = useCheckoutStore((s) => s.deliveryAreaId);
  const storedAddress = useCheckoutStore((s) => s.deliveryAddress);
  const storedNotes = useCheckoutStore((s) => s.deliveryNotes);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(storedAreaId);
  const [address, setAddress] = useState(storedAddress);
  const [notes, setNotes] = useState(storedNotes);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedAreaId(storedAreaId);
    setAddress(storedAddress);
    setNotes(storedNotes);
    setError(null);
  }, [open, storedAreaId, storedAddress, storedNotes]);

  const handleConfirm = async () => {
    if (!selectedAreaId) {
      setError('يرجى اختيار منطقة التوصيل');
      return;
    }
    const trimmed = address.trim();
    if (trimmed.length < 5) {
      setError('يرجى إدخال العنوان بالتفصيل (5 أحرف على الأقل)');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      saveDefaultDelivery({
        deliveryAreaId: selectedAreaId,
        deliveryAddress: trimmed,
        deliveryNotes: notes.trim(),
      });
      await qc.invalidateQueries({ queryKey: ['cart'] });
      toast('تم تحديث منطقة التوصيل', 'success');
      onConfirmed?.();
      onClose();
    } catch {
      toast('تعذّر حفظ منطقة التوصيل', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تغيير منطقة التوصيل"
      className="max-w-lg sm:max-w-xl"
    >
      <div className="flex flex-col min-h-0 max-h-[calc(92vh-5rem)] -m-5">
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {areasLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <DeliveryAreaSelectionForm
              areas={areas}
              selectedAreaId={selectedAreaId}
              onSelectArea={setSelectedAreaId}
              address={address}
              onAddressChange={setAddress}
              notes={notes}
              onNotesChange={setNotes}
              listMaxHeightClass="max-h-48 sm:max-h-56"
            />
          )}
          {error && <p className="text-sm text-error-600">{error}</p>}
        </div>
        <div className="shrink-0 border-t border-gray-100 p-4 bg-white">
          <Button
            className="w-full min-h-[48px]"
            onClick={handleConfirm}
            loading={submitting}
            disabled={areasLoading}
          >
            تأكيد
          </Button>
        </div>
      </div>
    </Modal>
  );
}
