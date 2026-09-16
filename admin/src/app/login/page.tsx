'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { useAdminAuth } from '@/stores/auth-store';
import { useToast } from '@/stores/toast-store';
import { getLoginErrorMessage } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { isAuthenticated, isInitialized, setAuth } = useAdminAuth();
  const router = useRouter();
  const toast = useToast((s) => s.show);

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, isInitialized, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const res = await adminApi.login(email, password);
      setAuth(email, res.accessToken, res.refreshToken);
      toast('تم تسجيل الدخول', 'success');
      router.push('/dashboard');
    } catch (err) {
      const message = getLoginErrorMessage(err);
      setFormError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="skeleton h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-4" noValidate>
        <h1 className="text-2xl font-bold text-center">تسجيل دخول الإدارة</h1>
        {formError && (
          <div
            className="rounded-xl border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700 text-center"
            role="alert"
            aria-live="polite"
          >
            {formError}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
          <input type="email" className="input ltr-input" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">كلمة المرور</label>
          <input type="password" className="input ltr-input" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
