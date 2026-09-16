'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { DeliveryArea } from '@/lib/types';
import { useCheckoutStore } from '@/stores/checkout-store';
import { useFirstAddStore } from '@/stores/first-add-store';
import { useCartActions } from '@/hooks/useCartMap';
import { useToastStore } from '@/stores/toast-store';
import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';
import { DeliveryAreaSelectionForm } from '@/components/delivery/DeliveryAreaSelectionForm';

interface FirstDeliveryAreaModalProps {
  areas: DeliveryArea[];
  areasLoading?: boolean;
}

export function FirstDeliveryAreaModal({ areas, areasLoading }: FirstDeliveryAreaModalProps) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { modalOpen, pending, closeModal, clearPending } = useFirstAddStore();
  const { add } = useCartActions();
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
    if (!modalOpen) return;
    setSelectedAreaId(storedAreaId);
    setAddress(storedAddress);
    setNotes(storedNotes);
    setError(null);
  }, [modalOpen, storedAreaId, storedAddress, storedNotes]);

  const handleClose = () => {
    closeModal();
    clearPending();
    setError(null);
  };

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

      if (pending) {
        const variant = pending.variantId
          ? pending.product.variants?.find((v) => v.id === pending.variantId)
          : undefined;
        add(
          pending.product.id,
          pending.quantity,
          pending.variantId,
          pending.product,
          variant,
        );
      }

      handleClose();
    } catch {
      toast('تعذّر حفظ منطقة التوصيل. حاول مرة أخرى.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!modalOpen) return null;

  return (
    <Modal open={modalOpen} onClose={handleClose} title="اختر منطقة التوصيل">
      <div className="flex flex-col min-h-0 max-h-[calc(92vh-5rem)] -m-5">
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-2 text-cta-600">
            <DeliveryScooterIcon className="w-5 h-5" />
            <p className="text-sm text-gray-600">حدّد منطقتك قبل إضافة أول منتج للسلة</p>
          </div>

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
              listMaxHeightClass="max-h-48"
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
            تأكيد ومتابعة
          </Button>
        </div>
      </div>
    </Modal>
  );
}
