'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuthStore } from '@/stores/auth-store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatPhoneIndicator, getErrorMessage } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';
import { useState } from 'react';
import {
  Heart,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearNotificationQueries } from '@/lib/notifications';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, logout, setUser } = useAuthStore();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: storeApi.getProfile,
  });

  const updateProfile = useMutation({
    mutationFn: () => storeApi.updateProfile({ name }),
    onSuccess: (updated) => {
      setUser(updated);
      setEditing(false);
      toast('تم تحديث الملف الشخصي', 'success');
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const phone = profile?.phoneNumber ?? user?.phoneNumber ?? '';
  const indicator = formatPhoneIndicator(phone);

  const links = [
    { href: '/orders', icon: Package, label: 'طلباتي', desc: 'تتبّع طلباتك' },
    { href: '/favorites', icon: Heart, label: 'المفضلة', desc: 'منتجاتك المحفوظة' },
    { href: '/settings', icon: Settings, label: 'الإعدادات', desc: 'الحساب والخصوصية والدعم' },
    { href: '/support', icon: MessageCircle, label: 'الدعم', desc: 'تواصل معنا' },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
        <div className="mb-6">
          <p className="text-xs text-navy-600 font-semibold mb-1">نحلة مول | Nahla Mall</p>
          <h1 className="text-2xl font-bold text-gray-900">حسابي</h1>
        </div>

        <div className="card mb-4 overflow-hidden p-0">
          <div className="bg-gradient-to-l from-primary-50 to-white px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white border border-primary-100 rounded-2xl flex items-center justify-center shadow-sm">
                <User className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{profile?.name || user?.name || 'عميل'}</p>
                <p className="text-sm text-gray-500 ltr-input flex items-center gap-2 mt-0.5" dir="ltr">
                  {indicator && (
                    <span className={cn('w-2 h-2 rounded-full', indicator === 'green' ? 'bg-phone-green' : 'bg-phone-red')} />
                  )}
                  {phone}
                </p>
              </div>
            </div>
          </div>
          <div className="p-5">
            {editing ? (
              <div className="space-y-3">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" />
                <div className="flex gap-2">
                  <Button size="sm" loading={updateProfile.isPending} onClick={() => updateProfile.mutate()}>حفظ</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>إلغاء</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setName(profile?.name ?? ''); setEditing(true); }}>
                تعديل الاسم
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {links.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="card flex items-center gap-3 hover:shadow-card-hover py-3.5 transition-shadow active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-900 block">{label}</span>
                <span className="text-xs text-gray-500">{desc}</span>
              </div>
            </Link>
          ))}
        </div>

        <Button
          variant="danger"
          className="w-full min-h-[48px]"
          onClick={() => {
            clearNotificationQueries(qc);
            logout();
            toast('تم تسجيل الخروج', 'info');
          }}
        >
          <LogOut className="w-4 h-4 ml-2" />
          تسجيل الخروج
        </Button>
      </div>
  );
}
