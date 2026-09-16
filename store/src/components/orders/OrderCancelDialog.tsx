'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface OrderCancelDialogProps {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function OrderCancelDialog({
  open,
  loading,
  error,
  onClose,
  onConfirm,
}: OrderCancelDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="هل تريد إلغاء الطلب؟" className="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          سيتم إلغاء الطلب ولن يتم تجهيزه أو توصيله.
        </p>

        {error && (
          <p className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          <Button type="button" variant="outline" className="flex-1 min-h-[48px]" onClick={onClose}>
            العودة
          </Button>
          <Button
            type="button"
            variant="danger"
            className="flex-1 min-h-[48px]"
            loading={loading}
            onClick={onConfirm}
          >
            نعم، إلغاء الطلب
          </Button>
        </div>
      </div>
    </Modal>
  );
}
