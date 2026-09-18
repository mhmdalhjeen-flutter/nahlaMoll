'use client';

import { useQueryClient } from '@tanstack/react-query';
import { clearNotificationQueries } from '@/lib/notifications';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  MapPin,
  Bell,
  Shield,
  CircleHelp,
  Phone,
  LogOut,
  Trash2,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsItemLink, SettingsItemButton } from '@/components/settings/SettingsItem';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const toast = useToastStore((s) => s.show);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    clearNotificationQueries(qc);
    logout();
    toast('تم تسجيل الخروج', 'info');
    setLogoutOpen(false);
    router.push('/');
  };

  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-lg">
      <SettingsHeader title="الإعدادات" backHref="/profile" />

      <SettingsSection title="الحساب">
        <SettingsItemLink href="/profile" icon={User} label="الملف الشخصي" />
        <SettingsItemLink
          href="/settings/addresses"
          icon={MapPin}
          label="عناويني"
          description="منطقة التوصيل والعنوان المحفوظ"
        />
      </SettingsSection>

      <SettingsSection title="الإشعارات">
        <SettingsItemLink
          href="/settings/notifications"
          icon={Bell}
          label="الإشعارات"
          description="اختار شو حابب يوصلك من نحلة مول"
        />
      </SettingsSection>

      <SettingsSection title="الخصوصية">
        <SettingsItemLink
          href="/settings/privacy"
          icon={Shield}
          label="الخصوصية والبيانات"
        />
      </SettingsSection>

      <SettingsSection title="الدعم">
        <SettingsItemLink href="/help" icon={CircleHelp} label="المساعدة" />
        <SettingsItemLink
          href="/contact"
          icon={Phone}
          label="تواصل معنا"
          description="واتساب، اتصال، أو المساعد"
        />
      </SettingsSection>

      <div className="mt-8 space-y-1">
        <SettingsItemButton
          icon={LogOut}
          label="تسجيل الخروج"
          onClick={() => setLogoutOpen(true)}
          tone="danger"
        />
        <SettingsItemButton
          icon={Trash2}
          label="حذف الحساب"
          onClick={() => router.push('/settings/delete-account')}
          tone="subtle"
        />
      </div>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} title="تسجيل الخروج؟" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            هل تريد تسجيل الخروج من حسابك؟
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <Button type="button" variant="outline" className="flex-1 min-h-[48px]" onClick={() => setLogoutOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" variant="danger" className="flex-1 min-h-[48px]" onClick={handleLogout}>
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
