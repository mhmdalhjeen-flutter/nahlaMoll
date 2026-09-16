'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import type { Category } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/ui/StateViews';
import { useToast } from '@/stores/toast-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CategoryListItem, CategoryModal } from '@/components/categories/CategoryForm';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const toast = useToast((s) => s.show);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await adminApi.getCategories());
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
    setEditCategory(null);
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditCategory(c);
    setModalOpen(true);
  };

  const toggleActive = async (c: Category) => {
    try {
      if (c.isActive) await adminApi.deactivateCategory(c.id);
      else await adminApi.activateCategory(c.id);
      toast(c.isActive ? 'تم إلغاء التفعيل' : 'تم التفعيل', 'success');
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deleteCategory(deleteId);
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
        title="التصنيفات"
        action={
          <button type="button" className="btn-primary min-h-[44px]" onClick={openCreate}>
            <Plus className="w-4 h-4 ml-2" /> إضافة الصنف
          </button>
        }
      />

      {loading && <LoadingGrid count={4} />}
      {error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && categories.length === 0 && (
        <EmptyState message="لا توجد تصنيفات. ابدأ بإضافة صنف جديد." />
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {categories.map((c) => (
            <CategoryListItem
              key={c.id}
              category={c}
              parentName={categories.find((p) => p.id === c.parentId)?.name}
              onEdit={() => openEdit(c)}
              onToggle={() => toggleActive(c)}
              onDelete={() => setDeleteId(c.id)}
            />
          ))}
        </div>
      )}

      <CategoryModal
        open={modalOpen}
        categories={categories}
        editCategory={editCategory}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="حذف التصنيف"
        message="هل أنت متأكد من حذف هذا التصنيف؟"
        danger
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
