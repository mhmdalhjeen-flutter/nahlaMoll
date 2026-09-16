'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Megaphone, Plus } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import type { Announcement } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { ActiveBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/stores/toast-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AnnouncementModal } from '@/components/announcements/AnnouncementModal';
import { getOptimizedImageUrl } from '@/lib/image-url';

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const toast = useToast((s) => s.show);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.getAnnouncements());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditItem(a);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deleteAnnouncement(deleteId);
      toast('تم الحذف', 'success');
      setDeleteId(null);
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="الإعلانات"
        action={
          <button type="button" className="btn-primary min-h-[44px]" onClick={openCreate}>
            <Plus className="w-4 h-4 ml-2" /> إضافة إعلان
          </button>
        }
      />

      {loading && <div className="card skeleton h-48" />}
      {error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState message="لا توجد إعلانات" />}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="card hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                {a.image ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                    <Image src={getOptimizedImageUrl(a.image, 'thumbnail')} alt="" fill className="object-cover" sizes="80px" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
                    <Megaphone className="w-7 h-7 text-primary-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold">{a.title}</h3>
                    <ActiveBadge active={a.isActive} />
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(a.startDate).toLocaleDateString('ar')}
                    {a.endDate ? ` — ${new Date(a.endDate).toLocaleDateString('ar')}` : ''}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn-secondary text-sm py-2" onClick={() => openEdit(a)}>
                      تعديل
                    </button>
                    <button type="button" className="btn-danger text-sm py-2" onClick={() => setDeleteId(a.id)}>
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnnouncementModal
        open={modalOpen}
        editItem={editItem}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف الإعلان"
        message="هل أنت متأكد؟"
        danger
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
