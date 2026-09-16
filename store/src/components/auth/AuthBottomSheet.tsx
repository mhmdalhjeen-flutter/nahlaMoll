'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { mergeCustomerSessionOnAuth } from '@/lib/customer-events';
import { useAuthStore } from '@/stores/auth-store';
import { usePendingAuthStore } from '@/stores/pending-auth-store';
import { useToastStore } from '@/stores/toast-store';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn, getErrorMessage } from '@/lib/utils';
import { AUTH_OTP_LENGTH } from '@/lib/pending-auth';

type AuthStep = 'phone' | 'otp';

function pendingActionHint(
  pending: ReturnType<typeof usePendingAuthStore.getState>['pendingAction'],
): string | null {
  if (!pending) return null;
  if (pending.type === 'ADD_TO_CART') {
    return 'سيتم إضافة المنتج إلى سلتك بعد تسجيل الدخول.';
  }
  if (pending.type === 'TOGGLE_FAVORITE') {
    return pending.addToFavorites
      ? 'سيتم إضافة المنتج إلى المفضلة بعد تسجيل الدخول.'
      : 'سيتم تحديث المفضلة بعد تسجيل الدخول.';
  }
  return null;
}

export function AuthBottomSheet() {
  const authSheetOpen = usePendingAuthStore((s) => s.authSheetOpen);
  const pendingAction = usePendingAuthStore((s) => s.pendingAction);
  const closeAuthSheet = usePendingAuthStore((s) => s.closeAuthSheet);
  const clearPendingAction = usePendingAuthStore((s) => s.clearPendingAction);

  const setAuth = useAuthStore((s) => s.setAuth);
  const toast = useToastStore((s) => s.show);

  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authSheetOpen) {
      setStep('phone');
      setPhone('');
      setOtp('');
      setDevOtpHint(null);
      setLoading(false);
      setPhoneError('');
      setOtpError('');
      return;
    }
  }, [authSheetOpen]);

  useEffect(() => {
    if (authSheetOpen && step === 'otp') {
      const t = window.setTimeout(() => otpInputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [authSheetOpen, step]);

  const validatePhone = () => {
    if (!/^(059|056)\d{7}$/.test(phone)) {
      setPhoneError('رقم الهاتف غير صحيح');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleDismiss = () => {
    if (pendingAction?.type === 'PAGE_ACCESS') return;
    closeAuthSheet(false);
  };

  const sendOtp = async () => {
    if (loading) return;
    if (!validatePhone()) return;
    setLoading(true);
    setOtpError('');
    try {
      const res = await storeApi.sendOtp(phone);
      setStep('otp');
      setOtp('');
      setDevOtpHint(res.devOtp ?? null);
      toast('تم إرسال رمز التحقق', 'success');
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (loading) return;
    if (otp.length !== AUTH_OTP_LENGTH) {
      setOtpError(`أدخل رمز مكون من ${AUTH_OTP_LENGTH} أرقام`);
      return;
    }
    setOtpError('');
    setLoading(true);
    try {
      const res = await storeApi.verifyOtp(phone, otp);
      setAuth(res.user, res.accessToken, res.refreshToken);
      void mergeCustomerSessionOnAuth();
      toast('تم تسجيل الدخول بنجاح', 'success');
      closeAuthSheet(true);
    } catch (e) {
      setOtpError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (!authSheetOpen) return null;

  const hint = pendingActionHint(pendingAction);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-end"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={handleDismiss}
        aria-label="إغلاق تسجيل الدخول"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-sheet-title"
        className={cn(
          'relative w-full max-w-lg bg-white rounded-t-2xl shadow-2xl',
          'flex flex-col overflow-hidden safe-area-bottom',
          'max-h-[38dvh] min-h-[240px] sm:max-h-[min(38dvh,360px)]',
          'motion-reduce:transition-none',
        )}
      >
        <div className="shrink-0 flex justify-center pt-2 pb-1">
          <span className="w-10 h-1 rounded-full bg-gray-200" aria-hidden />
        </div>

        <div className="px-5 pb-5 pt-1 overflow-y-auto flex-1 min-h-0">
          {step === 'phone' ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendOtp();
              }}
            >
              <div>
                <h2 id="auth-sheet-title" className="text-lg font-bold text-gray-900">
                  تسجيل الدخول
                </h2>
                <p className="text-sm text-gray-600 mt-1">أدخل رقم هاتفك</p>
              </div>

              {hint && (
                <p className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 leading-relaxed">
                  {hint}
                </p>
              )}

              <div>
                <label htmlFor="auth-phone" className="sr-only">
                  رقم الهاتف
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  error={phoneError}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full min-h-[48px] btn-cta inline-flex items-center justify-center gap-2"
                disabled={loading}
                aria-busy={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />}
                {loading ? 'جاري الإرسال...' : 'متابعة'}
              </Button>
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void verifyOtp();
              }}
            >
              <div>
                <h2 id="auth-sheet-title" className="text-lg font-bold text-gray-900">
                  تأكيد رقم الهاتف
                </h2>
                <p className="text-sm text-gray-600 mt-1">أدخل رمز التحقق المرسل إليك</p>
              </div>

              <p className="text-xs text-gray-500 text-center" dir="ltr">
                {phone}
              </p>

              {devOtpHint && (
                <p
                  className="text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 ltr-input"
                  dir="ltr"
                >
                  رمز التطوير (محلي فقط): {devOtpHint}
                </p>
              )}

              <div>
                <label htmlFor="auth-otp" className="sr-only">
                  رمز التحقق
                </label>
                <Input
                  ref={otpInputRef}
                  id="auth-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={AUTH_OTP_LENGTH}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, AUTH_OTP_LENGTH));
                    setOtpError('');
                  }}
                  className="ltr-input text-center text-xl tracking-[0.35em] min-h-[48px]"
                  dir="ltr"
                  disabled={loading}
                  aria-invalid={!!otpError}
                  aria-describedby={otpError ? 'auth-otp-error' : undefined}
                />
                {otpError && (
                  <p id="auth-otp-error" className="text-xs text-error-600 mt-1.5" role="alert">
                    {otpError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full min-h-[48px] btn-cta inline-flex items-center justify-center gap-2"
                disabled={loading}
                aria-busy={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />}
                {loading ? 'جاري التحقق...' : 'تأكيد'}
              </Button>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="text-sm text-primary-600 min-h-[44px] disabled:opacity-50"
                  disabled={loading}
                  onClick={() => void sendOtp()}
                >
                  إعادة إرسال الرمز
                </button>
                <button
                  type="button"
                  className="text-sm text-gray-500 min-h-[44px]"
                  disabled={loading}
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setDevOtpHint(null);
                    setOtpError('');
                  }}
                >
                  تغيير رقم الهاتف
                </button>
              </div>
            </form>
          )}

          {pendingAction && pendingAction.type !== 'PAGE_ACCESS' && (
            <button
              type="button"
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 min-h-[44px]"
              onClick={() => {
                clearPendingAction();
                handleDismiss();
              }}
            >
              إلغاء
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
