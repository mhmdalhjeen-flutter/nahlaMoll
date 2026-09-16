'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { NotificationSettingsContent } from '@/components/settings/notifications/NotificationSettingsContent';

export default function SettingsNotificationsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50/80">
        <div className="container mx-auto px-4 py-5 pb-24 max-w-lg">
          <SettingsHeader title="الإشعارات" backHref="/settings" />
          <p className="text-sm text-gray-600 mb-6 -mt-2 leading-relaxed">
            اختار شو حابب يوصلك من نحلة مول.
          </p>
          <NotificationSettingsContent />
        </div>
      </div>
    </AuthGuard>
  );
}
