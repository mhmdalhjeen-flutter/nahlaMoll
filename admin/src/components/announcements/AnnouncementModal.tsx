'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import type { Announcement } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/ui/FormField';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/stores/toast-store';

interface AnnouncementModalProps {
  open: boolean;
  editItem?: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AnnouncementModal({ open, editItem, onClose, onSuccess }: AnnouncementModalProps) {
  const toast = useToast((s) => s.show);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    image: null as string | null,
    isActive: true,
    priority: '0',
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setForm({
        title: editItem.title,
        content: editItem.content,
        image: editItem.image ?? null,
        isActive: editItem.isActive,
        priority: String(editItem.priority),
        startDate: editItem.startDate.slice(0, 10),
        endDate: editItem.endDate ? editItem.endDate.slice(0, 10) : '',
      });
    } else {
      setForm({
        title: '',
        content: '',
        image: null,
        isActive: true,
        priority: '0',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
      });
    }
    setErrors({});
  }, [open, editItem]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'عنوان الإعلان مطلوب';
    if (!form.content.trim()) next.content = 'محتوى الإعلان مطلوب';
    if (!form.startDate) next.startDate = 'تاريخ البداية مطلوب';
    const priority = parseInt(form.priority, 10);
    if (Number.isNaN(priority)) next.priority = 'يرجى إدخال أولوية صالحة';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      image: form.image,
      isActive: form.isActive,
      priority: parseInt(form.priority, 10),
      startDate: new Date(form.startDate),
      endDate: form.endDate ? new Date(form.endDate) : undefined,
    };

    try {
      if (editItem) {
        await adminApi.updateAnnouncement(editItem.id, payload);
        toast('تم تحديث الإعلان', 'success');
      } else {
        await adminApi.createAnnouncement(payload);
        toast('تم إضافة الإعلان بنجاح', 'success');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editItem ? 'تعديل الإعلان' : 'إضافة إعلان'}
      subtitle={editItem ? 'عدّل بيانات الإعلان' : 'أضف إعلاناً جديداً للمتجر'}
      size="md"
    >
      <form onSubmit={submit} className="space-y-5">
        <FormField label="العنوان" required>
          <input
            className={`input min-h-[48px] ${errors.title ? 'border-error-500' : ''}`}
            placeholder="عنوان الإعلان"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          {errors.title && <p className="text-xs text-error-600 mt-1">{errors.title}</p>}
        </FormField>

        <FormField label="المحتوى" required>
          <textarea
            className={`input min-h-[120px] ${errors.content ? 'border-error-500' : ''}`}
            placeholder="نص الإعلان"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          {errors.content && <p className="text-xs text-error-600 mt-1">{errors.content}</p>}
        </FormField>

        <ImageUpload
          label="صورة الإعلان (اختيارية)"
          value={form.image}
          onChange={(url) => setForm((f) => ({ ...f, image: url }))}
          onUpload={(file) => adminApi.uploadAnnouncementImage(file).then((r) => r.url)}
          placeholder="إضافة صورة"
        />

        <FormField label="الأولوية" hint="الأرقام الأعلى تظهر أولاً">
          <input
            type="number"
            className={`input ltr-input min-h-[48px] ${errors.priority ? 'border-error-500' : ''}`}
            dir="ltr"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          />
          {errors.priority && <p className="text-xs text-error-600 mt-1">{errors.priority}</p>}
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="تاريخ البداية" required>
            <input
              type="date"
              className={`input ltr-input min-h-[48px] ${errors.startDate ? 'border-error-500' : ''}`}
              dir="ltr"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            {errors.startDate && <p className="text-xs text-error-600 mt-1">{errors.startDate}</p>}
          </FormField>
          <FormField label="تاريخ النهاية" hint="اختياري">
            <input
              type="date"
              className="input ltr-input min-h-[48px]"
              dir="ltr"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </FormField>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <Switch
            label="نشط"
            description="الإعلانات غير النشطة لن تظهر للعملاء"
            checked={form.isActive}
            onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1 min-h-[48px]" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn-primary flex-1 min-h-[48px]" disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : editItem ? 'حفظ التعديلات' : 'إضافة الإعلان'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
