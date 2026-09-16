'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { adminApi } from '@/lib/admin-api';
import type { Category } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { slugifyCategoryName } from '@/lib/product-meta';
import { FormField } from '@/components/ui/FormField';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/stores/toast-store';
import { getOptimizedImageUrl } from '@/lib/image-url';

interface CategoryModalProps {
  open: boolean;
  categories: Category[];
  editCategory?: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryModal({
  open,
  categories,
  editCategory,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const toast = useToast((s) => s.show);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    parentId: '',
    isActive: true,
    image: null as string | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editCategory) {
      setForm({
        name: editCategory.name,
        parentId: editCategory.parentId ?? '',
        isActive: editCategory.isActive,
        image: editCategory.image ?? null,
      });
    } else {
      setForm({ name: '', parentId: '', isActive: true, image: null });
    }
    setErrors({});
  }, [open, editCategory]);

  const uploadImage = async (file: File) => {
    const res = await adminApi.uploadCategoryImage(file);
    toast('تم رفع الصورة', 'success');
    return res.url;
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'اسم الصنف مطلوب';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: editCategory?.slug ?? slugifyCategoryName(form.name),
        parentId: form.parentId || undefined,
        isActive: form.isActive,
        image: form.image || undefined,
      };

      if (editCategory) {
        await adminApi.updateCategory(editCategory.id, payload);
        toast('تم تحديث الصنف', 'success');
      } else {
        await adminApi.createCategory(payload);
        toast('تم إضافة الصنف بنجاح', 'success');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const parentOptions = categories.filter((c) => c.id !== editCategory?.id && !c.parentId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editCategory ? 'تعديل الصنف' : 'إضافة الصنف'}
      subtitle={editCategory ? 'عدّل بيانات الصنف' : 'أضف صنفاً جديداً للمتجر'}
      size="md"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="flex justify-center sm:justify-start">
          <ImageUpload
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            onUpload={uploadImage}
            placeholder="صورة الصنف"
          />
        </div>

        <FormField label="اسم الصنف" required>
          <input
            className={`input min-h-[48px] ${errors.name ? 'border-error-500' : ''}`}
            placeholder="مثال: خضروات"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          {errors.name && <p className="text-xs text-error-600 mt-1">{errors.name}</p>}
        </FormField>

        <FormField label="الصنف الأب" hint="اتركه فارغاً لتصنيف رئيسي">
          <select
            className="input min-h-[48px]"
            value={form.parentId}
            onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
          >
            <option value="">بدون صنف أب (تصنيف رئيسي)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="rounded-xl bg-gray-50 p-4">
          <Switch
            label={form.isActive ? 'نشط' : 'غير نشط'}
            description="الأصناف غير النشطة لن تظهر في المتجر"
            checked={form.isActive}
            onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1 min-h-[48px]" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn-primary flex-1 min-h-[48px]" disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : editCategory ? 'حفظ التعديلات' : 'إضافة الصنف'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** @deprecated Use CategoryModal — kept for import compatibility */
export const CategoryForm = CategoryModal;

interface CategoryListItemProps {
  category: Category;
  parentName?: string;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export function CategoryListItem({ category, parentName, onEdit, onToggle, onDelete }: CategoryListItemProps) {
  return (
    <div className="card p-0 overflow-hidden flex gap-0 sm:flex-row flex-col">
      <div className="relative w-full sm:w-24 h-24 sm:h-auto shrink-0 bg-gray-100">
        {category.image ? (
          <Image src={getOptimizedImageUrl(category.image, 'thumbnail')} alt={category.name} fill className="object-cover" sizes="96px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">بدون صورة</div>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900">{category.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{parentName ? `فرعي · ${parentName}` : 'تصنيف رئيسي'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${category.isActive ? 'badge-success' : 'badge-error'}`}>
            {category.isActive ? 'نشط' : 'غير نشط'}
          </span>
          <button type="button" className="btn-secondary text-sm py-2" onClick={onEdit}>
            تعديل
          </button>
          <button type="button" className="btn-secondary text-sm py-2" onClick={onToggle}>
            {category.isActive ? 'إلغاء تفعيل' : 'تفعيل'}
          </button>
          <button type="button" className="btn-danger text-sm py-2" onClick={onDelete}>
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}
