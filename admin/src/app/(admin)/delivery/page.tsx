'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import type { DeliveryArea } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/ui/StateViews';
import { useToast } from '@/stores/toast-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DeliveryAreaGroupView,
  DeliveryAreaModal,
  getMainAreas,
  groupDeliveryAreasForAdmin,
  type DeliveryAreaFormState,
} from '@/components/delivery/DeliveryAreaComponents';

export default function DeliveryPage() {
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editArea, setEditArea] = useState<DeliveryArea | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const toast = useToast((s) => s.show);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAreas(await adminApi.getDeliveryAreas());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditArea(null);
    setModalOpen(true);
  };

  const openEdit = (area: DeliveryArea) => {
    setEditArea(area);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditArea(null);
  };

  const handleSubmit = async (form: DeliveryAreaFormState) => {
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      deliveryFee: parseFloat(form.deliveryFee),
      eligibleForFreeDelivery: true,
      isActive: form.isActive,
      areaType: form.areaType,
      parentId: form.areaType === 'MAIN' ? undefined : form.parentId || undefined,
      region: form.areaType === 'MAIN' ? form.region || undefined : undefined,
    };
    try {
      if (editArea) {
        await adminApi.updateDeliveryArea(editArea.id, payload);
        toast('تم تحديث المنطقة بنجاح', 'success');
      } else {
        await adminApi.createDeliveryArea(payload);
        toast('تم إضافة المنطقة بنجاح', 'success');
      }
      closeModal();
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (area: DeliveryArea, active: boolean) => {
    setTogglingId(area.id);
    try {
      if (active) await adminApi.activateDeliveryArea(area.id);
      else await adminApi.deactivateDeliveryArea(area.id);
      toast(active ? 'تم تفعيل المنطقة' : 'تم إيقاف المنطقة', 'success');
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deleteDeliveryArea(deleteId);
      toast('تم حذف المنطقة', 'success');
      setDeleteId(null);
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const groups = groupDeliveryAreasForAdmin(areas);
  const mainAreas = getMainAreas(areas);

  return (
    <div className="pb-8">
      <PageHeader
        title="مناطق التوصيل"
        action={
          <button type="button" className="btn-primary min-h-[44px]" onClick={openAdd}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة منطقة
          </button>
        }
      />

      {loading && <LoadingGrid count={4} />}
      {error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && areas.length === 0 && (
        <EmptyState message="لا توجد مناطق توصيل. ابدأ بإضافة منطقة جديدة." />
      )}

      {!loading && !error && areas.length > 0 && (
        <div className="space-y-8">
          {groups.map(({ main, children: subAreas }) => (
            <DeliveryAreaGroupView
              key={main.id}
              main={main}
              subAreas={subAreas}
              togglingId={togglingId}
              onEdit={openEdit}
              onDelete={setDeleteId}
              onToggleActive={handleToggle}
            />
          ))}
        </div>
      )}

      <DeliveryAreaModal
        open={modalOpen}
        editArea={editArea}
        mainAreas={mainAreas}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المنطقة"
        message="هل أنت متأكد من حذف هذه المنطقة؟ لا يمكن التراجع عن هذا الإجراء."
        danger
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
