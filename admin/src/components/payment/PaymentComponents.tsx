'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Circle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { PaymentAccount, PaymentMethodKey } from '@/lib/types';
import { getOptimizedImageUrl } from '@/lib/image-url';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  BANK_OF_PALESTINE: 'بنك فلسطين',
  PALPAY: 'PalPay',
  JAWWAL_PAY: 'Jawwal Pay',
};

interface PaymentAccountCardProps {
  account: PaymentAccount;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: () => void;
  activating?: boolean;
}

export function PaymentAccountCard({
  account,
  onEdit,
  onDelete,
  onActivate,
  activating,
}: PaymentAccountCardProps) {
  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${
        account.isActive
          ? 'border-primary-400 bg-primary-50/40 shadow-sm'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <button
          type="button"
          onClick={onActivate}
          disabled={account.isActive || activating}
          className="flex items-center gap-2 text-sm font-medium disabled:opacity-60"
          aria-label={account.isActive ? 'الحساب النشط' : 'تفعيل الحساب'}
        >
          <Circle
            className={`w-4 h-4 ${account.isActive ? 'fill-primary-600 text-primary-600' : 'text-gray-300'}`}
          />
          <span className={account.isActive ? 'text-primary-700' : 'text-gray-600'}>
            {account.isActive ? 'الحساب النشط' : 'غير مستخدم'}
          </span>
        </button>
      </div>

      <p className="font-bold text-gray-900 mb-1">{account.accountName}</p>
      <p className="text-sm text-gray-600 ltr-input" dir="ltr">
        {account.accountNumber}
      </p>

      {account.qrImageUrl && (
        <div className="relative w-20 h-20 mt-3 rounded-xl overflow-hidden border border-gray-200">
          <Image src={getOptimizedImageUrl(account.qrImageUrl, 'qr')} alt="QR" fill className="object-cover" sizes="80px" />
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={onEdit} className="btn-secondary flex-1 text-sm min-h-[40px]">
          <Pencil className="w-3.5 h-3.5 ml-1" />
          تعديل
        </button>
        <button type="button" onClick={onDelete} className="btn-danger flex-1 text-sm min-h-[40px]">
          <Trash2 className="w-3.5 h-3.5 ml-1" />
          حذف
        </button>
      </div>
    </div>
  );
}

export interface PaymentAccountFormState {
  accountName: string;
  accountNumber: string;
  qrImageUrl: string | null;
}

interface PaymentAccountModalProps {
  open: boolean;
  methodLabel: string;
  editAccount?: PaymentAccount | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentAccountFormState) => Promise<void>;
  onUploadQr: (file: File) => Promise<string>;
}

export function PaymentAccountModal({
  open,
  methodLabel,
  editAccount,
  submitting,
  onClose,
  onSubmit,
  onUploadQr,
}: PaymentAccountModalProps) {
  const [form, setForm] = useState<PaymentAccountFormState>({
    accountName: '',
    accountNumber: '',
    qrImageUrl: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editAccount) {
      setForm({
        accountName: editAccount.accountName,
        accountNumber: editAccount.accountNumber,
        qrImageUrl: editAccount.qrImageUrl ?? null,
      });
    } else {
      setForm({ accountName: '', accountNumber: '', qrImageUrl: null });
    }
    setErrors({});
  }, [open, editAccount]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.accountName.trim()) next.accountName = 'اسم الحساب مطلوب';
    if (!form.accountNumber.trim()) next.accountNumber = 'رقم الحساب مطلوب';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editAccount ? 'تعديل الحساب' : 'إضافة حساب'}
      subtitle={methodLabel}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">اسم الحساب</label>
          <input
            className={`input min-h-[48px] ${errors.accountName ? 'border-error-500' : ''}`}
            value={form.accountName}
            onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
            placeholder="مثال: الحساب الرئيسي"
          />
          {errors.accountName && <p className="text-xs text-error-600 mt-1">{errors.accountName}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">رقم الحساب</label>
          <input
            className={`input ltr-input min-h-[48px] ${errors.accountNumber ? 'border-error-500' : ''}`}
            dir="ltr"
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            placeholder="XXXXX"
          />
          {errors.accountNumber && <p className="text-xs text-error-600 mt-1">{errors.accountNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">QR Code (اختياري)</label>
          <ImageUpload
            value={form.qrImageUrl}
            onChange={(url) => setForm((f) => ({ ...f, qrImageUrl: url }))}
            onUpload={onUploadQr}
            placeholder="إضافة QR"
            size="md"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1 min-h-[48px]" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn-primary flex-1 min-h-[48px]" disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : editAccount ? 'حفظ التعديلات' : 'إضافة حساب'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ElectronicMethodCardProps {
  method: PaymentMethodKey;
  enabled: boolean;
  accounts: PaymentAccount[];
  togglingMethod?: boolean;
  activatingId?: string | null;
  onToggleMethod: (enabled: boolean) => void;
  onAddAccount: () => void;
  onEditAccount: (account: PaymentAccount) => void;
  onDeleteAccount: (account: PaymentAccount) => void;
  onActivateAccount: (account: PaymentAccount) => void;
}

export function ElectronicMethodCard({
  method,
  enabled,
  accounts,
  togglingMethod,
  activatingId,
  onToggleMethod,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onActivateAccount,
}: ElectronicMethodCardProps) {
  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">{PAYMENT_METHOD_LABELS[method]}</h3>
        <Switch checked={enabled} disabled={togglingMethod} onChange={onToggleMethod} />
      </div>

      <div className={enabled ? '' : 'opacity-60 pointer-events-none'}>
        <p className="text-sm font-semibold text-gray-700 mb-3">الحسابات</p>

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
            لا توجد حسابات بعد
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {accounts.map((account) => (
              <PaymentAccountCard
                key={account.id}
                account={account}
                activating={activatingId === account.id}
                onEdit={() => onEditAccount(account)}
                onDelete={() => onDeleteAccount(account)}
                onActivate={() => onActivateAccount(account)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onAddAccount}
          className="mt-4 w-full btn-secondary min-h-[44px] border-dashed"
        >
          <Plus className="w-4 h-4 ml-1.5" />
          إضافة حساب
        </button>
      </div>
    </section>
  );
}
