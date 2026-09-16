'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Banknote, Check, CreditCard, Lock, Smartphone } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-url';
import type { ElectronicPaymentMethodKey, PublicPaymentConfig } from '@/lib/types';
import {
  ELECTRONIC_PAYMENT_LABELS,
  getEnabledElectronicMethods,
  type PaymentMode,
} from '@/lib/payment-config';
import {
  CHECKOUT_PAYMENT_DETAILS_ID,
  scrollToPaymentDetailsAfterRender,
} from '@/lib/scroll-payment-details';
import { Input } from '@/components/ui/Input';
import { CopyField } from './CopyField';
import { PaymentProofUpload } from './PaymentProofUpload';

interface PaymentMethodSectionProps {
  config: PublicPaymentConfig;
  paymentMode: PaymentMode | null;
  onPaymentModeChange: (mode: PaymentMode) => void;
  selectedMethod: ElectronicPaymentMethodKey | null;
  onSelectedMethodChange: (key: ElectronicPaymentMethodKey) => void;
  transferAccountName: string;
  onTransferAccountNameChange: (value: string) => void;
  paymentProofUrl: string | null;
  onPaymentProofChange: (url: string | null) => void;
  orderTotal: number;
  step?: number;
  className?: string;
}

const METHOD_ICONS: Record<ElectronicPaymentMethodKey, typeof CreditCard> = {
  bankOfPalestine: CreditCard,
  palPay: Smartphone,
  jawwalPay: Smartphone,
};

interface MethodCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description?: string | null;
}

function MethodCard({ selected, onSelect, icon, title, description }: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full text-right rounded-2xl border-2 p-4 transition-all min-h-[80px] touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        selected
          ? 'border-primary-500 bg-primary-50 shadow-md ring-1 ring-primary-100'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              selected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600',
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{title}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5',
            selected ? 'border-primary-500 bg-primary-500 text-gray-900' : 'border-gray-300 bg-white',
          )}
          aria-hidden
        >
          {selected && <Check className="w-3.5 h-3.5" />}
        </span>
      </div>
    </button>
  );
}

export function PaymentMethodSection({
  config,
  paymentMode,
  onPaymentModeChange,
  selectedMethod,
  onSelectedMethodChange,
  transferAccountName,
  onTransferAccountNameChange,
  paymentProofUrl,
  onPaymentProofChange,
  orderTotal,
  step = 4,
  className,
}: PaymentMethodSectionProps) {
  const electronicMethods = getEnabledElectronicMethods(config);
  const selectedAccount = selectedMethod ? config.methods[selectedMethod] : null;
  const showElectronicDetails = paymentMode === 'electronic' && selectedMethod && selectedAccount;
  const pendingScrollMethodRef = useRef<ElectronicPaymentMethodKey | null>(null);

  const selectElectronic = (key: ElectronicPaymentMethodKey) => {
    if (paymentMode === 'electronic' && selectedMethod === key) return;
    pendingScrollMethodRef.current = key;
    onPaymentModeChange('electronic');
    onSelectedMethodChange(key);
  };

  useEffect(() => {
    if (!showElectronicDetails || !selectedMethod) return;
    if (pendingScrollMethodRef.current !== selectedMethod) return;
    pendingScrollMethodRef.current = null;
    scrollToPaymentDetailsAfterRender();
  }, [showElectronicDetails, selectedMethod]);

  return (
    <section
      id="checkout-payment"
      className={cn(
        'scroll-mt-20 rounded-2xl border-2 border-primary-100 bg-gradient-to-b from-primary-50/50 to-white p-4 shadow-sm',
        className,
      )}
      aria-labelledby="checkout-payment-title"
    >
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          {step != null && (
            <span
              className="shrink-0 w-6 h-6 rounded-full bg-primary-500 text-gray-900 text-xs font-bold flex items-center justify-center tabular-nums"
              aria-hidden
            >
              {step}
            </span>
          )}
          <CreditCard className="w-5 h-5 text-primary-600 shrink-0" aria-hidden />
          <h2 id="checkout-payment-title" className="font-bold text-lg text-gray-900">
            طريقة الدفع
          </h2>
        </div>
        <p className="text-sm text-gray-500 pr-8">اختر الطريقة المناسبة لك لإتمام الطلب.</p>
      </header>

      <div className="space-y-5">
        {config.cod.enabled && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 tracking-wide">الدفع عند الاستلام</p>
            <MethodCard
              selected={paymentMode === 'cod'}
              onSelect={() => onPaymentModeChange('cod')}
              icon={<Banknote className="w-5 h-5" aria-hidden />}
              title="الدفع عند الاستلام"
              description={config.cod.note ?? 'ادفع عند استلام طلبك'}
            />
          </div>
        )}

        {electronicMethods.length > 0 && (
          <div className="space-y-2">
            {config.cod.enabled && electronicMethods.length > 0 && (
              <p className="text-xs font-semibold text-gray-400 text-center py-1">أو الدفع الإلكتروني</p>
            )}
            {!config.cod.enabled && (
              <p className="text-xs font-semibold text-gray-500 tracking-wide">الدفع الإلكتروني</p>
            )}
            <div className="space-y-2">
              {electronicMethods.map(({ key, label }) => {
                const Icon = METHOD_ICONS[key] ?? CreditCard;
                const selected = paymentMode === 'electronic' && selectedMethod === key;
                return (
                  <MethodCard
                    key={key}
                    selected={selected}
                    onSelect={() => selectElectronic(key)}
                    icon={<Icon className="w-5 h-5" aria-hidden />}
                    title={label}
                    description="تحويل أو دفع إلكتروني"
                  />
                );
              })}
            </div>
          </div>
        )}

        {showElectronicDetails && (
          <div
            id={CHECKOUT_PAYMENT_DETAILS_ID}
            className={cn(
              'rounded-2xl border bg-white shadow-sm overflow-hidden scroll-mt-24',
              'border-primary-200 ring-1 ring-primary-100/80',
            )}
          >
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary-600 shrink-0" aria-hidden />
              <p className="text-sm font-bold text-gray-900">تفاصيل الدفع</p>
            </div>

            <div className="p-4 space-y-5">
              <div className="text-center py-3 rounded-xl bg-primary-50/80 border border-primary-100">
                <p className="text-xs text-gray-600 mb-1">المبلغ المطلوب دفعه</p>
                <p className="text-3xl font-bold text-gray-900 tabular-nums">
                  {formatPrice(orderTotal)} ₪
                </p>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-sm font-medium text-gray-900">حوّل المبلغ إلى:</p>
                <p className="text-sm font-bold text-primary-800">
                  {ELECTRONIC_PAYMENT_LABELS[selectedMethod!]}
                </p>

                <dl className="space-y-3">
                  <CopyField label="اسم الحساب" value={selectedAccount.accountName} />
                  <CopyField label="رقم الحساب / المحفظة" value={selectedAccount.accountNumber} />
                </dl>

                {selectedAccount.qrImageUrl && (
                  <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                    <p className="text-xs text-gray-500">امسح الرمز للدفع</p>
                    <div className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                      <Image
                        src={getOptimizedImageUrl(selectedAccount.qrImageUrl, 'qr')}
                        alt="QR للتحويل"
                        fill
                        className="object-contain p-2"
                        sizes="176px"
                      />
                    </div>
                  </div>
                )}

                {config.paymentInstructions && (
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-700">تعليمات الدفع</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {config.paymentInstructions}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label htmlFor="transfer-account-name" className="block text-sm font-medium text-gray-900 mb-2">
                  اسم الحساب الذي تم التحويل منه <span className="text-error-500">*</span>
                </label>
                <Input
                  id="transfer-account-name"
                  value={transferAccountName}
                  onChange={(e) => onTransferAccountNameChange(e.target.value)}
                  placeholder="الاسم كما يظهر في التحويل"
                  className="min-h-[48px]"
                />
              </div>

              <PaymentProofUpload
                value={paymentProofUrl}
                onChange={onPaymentProofChange}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
