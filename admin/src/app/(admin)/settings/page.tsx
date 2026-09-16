'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import type { Settings } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/StateViews';
import { useToast } from '@/stores/toast-store';

export default function SettingsPage() {
  const toast = useToast((s) => s.show);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    storeName: '',
    storePhone: '',
    isStoreOpen: true,
    storeClosedMessage: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s: Settings = await adminApi.getSettings();
      setForm({
        storeName: s.storeName,
        storePhone: s.storePhone ?? '',
        isStoreOpen: s.isStoreOpen,
        storeClosedMessage: s.storeClosedMessage ?? '',
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateSettings({
        storeName: form.storeName,
        storePhone: form.storePhone.trim() || undefined,
        isStoreOpen: form.isStoreOpen,
        storeClosedMessage: form.storeClosedMessage || undefined,
      });
      toast('تم حفظ الإعدادات', 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card skeleton h-96" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="إعدادات المتجر" />
      <form onSubmit={submit} className="card max-w-2xl space-y-4">
        <div className="p-4 rounded-xl border-2 border-dashed flex items-center justify-between">
          <div>
            <p className="font-bold">{form.isStoreOpen ? 'المتجر مفتوح' : 'المتجر مغلق'}</p>
            <p className="text-sm text-gray-500">تحكم في حالة المتجر للعملاء</p>
          </div>
          <button
            type="button"
            className={form.isStoreOpen ? 'btn-danger' : 'btn-primary'}
            onClick={() => setForm({ ...form, isStoreOpen: !form.isStoreOpen })}
          >
            {form.isStoreOpen ? 'إغلاق المتجر' : 'فتح المتجر'}
          </button>
        </div>

        <div className="rounded-xl bg-primary-50 border border-primary-100 p-4 text-sm text-gray-700 space-y-1">
          <p className="font-semibold text-primary-800">قواعد التوصيل المجاني</p>
          <p>يُحسب التقدم كنسبة مئوية من مساهمة المنتجات (مجموع: نسبة المنتج × الكمية).</p>
          <p>عند الوصول إلى <strong>95%</strong> أو أكثر → توصيل مجاني في المناطق المؤهلة.</p>
          <p>شريط التقدم للعميل لا يتجاوز 100%.</p>
        </div>

        <Field label="اسم المتجر">
          <input className="input" required value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
        </Field>
        <Field label="رقم واتساب للتواصل">
          <input
            className="input ltr-input"
            dir="ltr"
            type="tel"
            inputMode="tel"
            value={form.storePhone}
            onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
            placeholder="059xxxxxxx أو 056xxxxxxx"
          />
          <p className="text-xs text-gray-500 mt-1">
            يظهر زر واتساب للعملاء عند إدخال الرقم. يُفضّل الصيغة المحلية مثل 059 أو 056.
          </p>
        </Field>
        <Field label="رسالة الإغلاق">
          <textarea className="input" value={form.storeClosedMessage} onChange={(e) => setForm({ ...form, storeClosedMessage: e.target.value })} placeholder="تظهر للعملاء عند إغلاق المتجر" />
        </Field>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
