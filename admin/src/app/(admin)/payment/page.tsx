'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import type { PaymentAccount, PaymentAdminConfig, PaymentMethodKey } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/StateViews';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/stores/toast-store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ElectronicMethodCard,
  PaymentAccountModal,
  PAYMENT_METHOD_LABELS,
  type PaymentAccountFormState,
} from '@/components/payment/PaymentComponents';

const METHODS: PaymentMethodKey[] = ['BANK_OF_PALESTINE', 'PALPAY', 'JAWWAL_PAY'];

export default function PaymentPage() {
  const toast = useToast((s) => s.show);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PaymentAdminConfig | null>(null);
  const [codEnabled, setCodEnabled] = useState(false);
  const [codNote, setCodNote] = useState('');
  const [savingCod, setSavingCod] = useState(false);
  const [togglingMethod, setTogglingMethod] = useState<PaymentMethodKey | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountMethod, setAccountMethod] = useState<PaymentMethodKey>('BANK_OF_PALESTINE');
  const [editAccount, setEditAccount] = useState<PaymentAccount | null>(null);
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<PaymentAccount | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getPaymentConfig();
      setConfig(data);
      setCodEnabled(data.cod.enabled);
      setCodNote(data.cod.note ?? '');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCod = async (enabled: boolean, note: string) => {
    setSavingCod(true);
    try {
      await adminApi.updateCodSettings({ codEnabled: enabled, codNote: note || undefined });
      toast('تم حفظ إعدادات الدفع عند التوصيل', 'success');
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSavingCod(false);
    }
  };

  const handleCodToggle = async (enabled: boolean) => {
    setCodEnabled(enabled);
    await saveCod(enabled, codNote);
  };

  const handleCodNoteBlur = async () => {
    await saveCod(codEnabled, codNote);
  };

  const toggleMethod = async (method: PaymentMethodKey, enabled: boolean) => {
    setTogglingMethod(method);
    try {
      await adminApi.setPaymentMethodEnabled(method, enabled);
      toast(`تم ${enabled ? 'تفعيل' : 'إيقاف'} ${PAYMENT_METHOD_LABELS[method]}`, 'success');
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setTogglingMethod(null);
    }
  };

  const openAddAccount = (method: PaymentMethodKey) => {
    setAccountMethod(method);
    setEditAccount(null);
    setAccountModalOpen(true);
  };

  const openEditAccountModal = (account: PaymentAccount) => {
    setAccountMethod(account.method);
    setEditAccount(account);
    setAccountModalOpen(true);
  };

  const uploadQr = async (file: File) => {
    const res = await adminApi.uploadPaymentQr(file);
    toast('تم رفع الصورة', 'success');
    return res.url;
  };

  const submitAccount = async (form: PaymentAccountFormState) => {
    setSubmittingAccount(true);
    try {
      const payload = {
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        qrImageUrl: form.qrImageUrl || undefined,
      };
      if (editAccount) {
        await adminApi.updatePaymentAccount(editAccount.id, payload);
        toast('تم تحديث الحساب', 'success');
      } else {
        await adminApi.createPaymentAccount({
          method: accountMethod,
          ...payload,
        });
        toast('تم إضافة الحساب', 'success');
      }
      setAccountModalOpen(false);
      setEditAccount(null);
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingAccount(false);
    }
  };

  const activateAccount = async (account: PaymentAccount) => {
    setActivatingId(account.id);
    try {
      await adminApi.activatePaymentAccount(account.id);
      toast('تم تفعيل الحساب', 'success');
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setActivatingId(null);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deleteAccount) return;
    try {
      await adminApi.deletePaymentAccount(deleteAccount.id);
      toast('تم حذف الحساب', 'success');
      setDeleteAccount(null);
      load();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="skeleton h-10 w-48" />
        <div className="card skeleton h-40" />
        <div className="card skeleton h-64" />
      </div>
    );
  }

  if (error || !config) {
    return <ErrorState message={error ?? 'تعذر تحميل الإعدادات'} onRetry={load} />;
  }

  return (
    <div className="pb-8 max-w-3xl space-y-6">
      <PageHeader title="إعدادات الدفع" />

      <section className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">الدفع عند التوصيل</h2>
        </div>

        <Switch
          label="تفعيل الدفع عند التوصيل"
          checked={codEnabled}
          disabled={savingCod}
          onChange={handleCodToggle}
        />

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">ملاحظة للزبون</label>
          <textarea
            className="input min-h-[100px]"
            placeholder="ملاحظة اختيارية تظهر للزبون عند اختيار الدفع عند التوصيل..."
            value={codNote}
            onChange={(e) => setCodNote(e.target.value)}
            onBlur={handleCodNoteBlur}
            disabled={!codEnabled || savingCod}
          />
        </div>
      </section>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">الدفع الإلكتروني</h2>
        <div className="space-y-4">
          {METHODS.map((method) => (
            <ElectronicMethodCard
              key={method}
              method={method}
              enabled={config.methods[method].enabled}
              accounts={config.methods[method].accounts}
              togglingMethod={togglingMethod === method}
              activatingId={activatingId}
              onToggleMethod={(enabled) => toggleMethod(method, enabled)}
              onAddAccount={() => openAddAccount(method)}
              onEditAccount={openEditAccountModal}
              onDeleteAccount={setDeleteAccount}
              onActivateAccount={activateAccount}
            />
          ))}
        </div>
      </div>

      <PaymentAccountModal
        open={accountModalOpen}
        methodLabel={PAYMENT_METHOD_LABELS[accountMethod]}
        editAccount={editAccount}
        submitting={submittingAccount}
        onClose={() => {
          setAccountModalOpen(false);
          setEditAccount(null);
        }}
        onSubmit={submitAccount}
        onUploadQr={uploadQr}
      />

      <ConfirmDialog
        open={!!deleteAccount}
        title="حذف الحساب"
        message="هل أنت متأكد من حذف هذا الحساب؟"
        danger
        confirmLabel="حذف"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setDeleteAccount(null)}
      />
    </div>
  );
}
