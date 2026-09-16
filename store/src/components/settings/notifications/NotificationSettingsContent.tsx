'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { ErrorState } from '@/components/ui/EmptyState';
import { storeApi } from '@/lib/store-api';
import { NOTIFICATION_PREFERENCES_API_ENABLED } from '@/lib/notifications-config';
import { NOTIFICATION_CATEGORIES } from '@/lib/notification-preferences';
import type {
  CustomerNotificationPreferences,
  NotificationPreferencePatch,
} from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';
import { useAuthStore } from '@/stores/auth-store';
import { NotificationPreferenceCard } from './NotificationPreferenceCard';
import { DoNotDisturbSection } from './DoNotDisturbSection';

const PREFERENCES_QUERY_KEY = ['notification-preferences'] as const;

export function NotificationSettingsContent() {
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const userEmail = useAuthStore((s) => s.user?.email);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const {
    data: preferences,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: storeApi.getNotificationPreferences,
    enabled: NOTIFICATION_PREFERENCES_API_ENABLED,
  });

  const mutation = useMutation({
    mutationFn: (patch: NotificationPreferencePatch) =>
      storeApi.updateNotificationPreferences(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });
      const previous = qc.getQueryData<CustomerNotificationPreferences>(PREFERENCES_QUERY_KEY);
      if (previous) {
        qc.setQueryData<CustomerNotificationPreferences>(PREFERENCES_QUERY_KEY, {
          ...previous,
          ...patch,
        });
      }
      return { previous };
    },
    onSuccess: () => {
      toast('✓ تم حفظ الإعداد', 'success');
    },
    onError: (err, _patch, context) => {
      if (context?.previous) {
        qc.setQueryData(PREFERENCES_QUERY_KEY, context.previous);
      }
      toast(getErrorMessage(err), 'error');
    },
    onSettled: () => {
      setSavingKey(null);
      qc.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },
  });

  const savePatch = (patch: NotificationPreferencePatch, key: string) => {
    setSavingKey(key);
    mutation.mutate(patch);
  };

  if (!NOTIFICATION_PREFERENCES_API_ENABLED) {
    return <PreferencesUnavailable />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  if (isError || !preferences) {
    return (
      <ErrorState
        message="تعذّر تحميل إعدادات الإشعارات"
        onRetry={() => refetch()}
      />
    );
  }

  const pushSupported = preferences.channels.pushSupported;
  const emailSupported = preferences.channels.emailSupported && !!userEmail?.trim();
  const schedulingSupported = preferences.channels.deliverySchedulingSupported;

  return (
    <div className="space-y-3">
      {NOTIFICATION_CATEGORIES.map((category) => (
        <NotificationPreferenceCard
          key={category.key}
          id={`pref-${category.key}`}
          emoji={category.emoji}
          title={category.title}
          description={category.description}
          checked={preferences[category.key]}
          saving={savingKey === category.key && mutation.isPending}
          onChange={(checked) => savePatch({ [category.key]: checked }, category.key)}
        />
      ))}

      <section className="pt-4 space-y-3" aria-labelledby="advanced-settings-heading">
        <h2 id="advanced-settings-heading" className="text-sm font-semibold text-gray-700 px-1">
          إعدادات متقدمة
        </h2>

        <DoNotDisturbSection
          enabled={preferences.doNotDisturbEnabled}
          from={preferences.doNotDisturbFrom ?? '22:00'}
          until={preferences.doNotDisturbUntil ?? '08:00'}
          saving={savingKey === 'dnd' && mutation.isPending}
          schedulingSupported={schedulingSupported}
          onEnabledChange={(enabled) =>
            savePatch({ doNotDisturbEnabled: enabled }, 'dnd')
          }
          onFromChange={(doNotDisturbFrom) =>
            savePatch({ doNotDisturbFrom }, 'dnd-from')
          }
          onUntilChange={(doNotDisturbUntil) =>
            savePatch({ doNotDisturbUntil }, 'dnd-until')
          }
        />

        <ChannelInfrastructureNotice
          pushSupported={pushSupported}
          emailSupported={emailSupported}
          hasEmail={!!userEmail?.trim()}
        />
      </section>
    </div>
  );
}

function ChannelInfrastructureNotice({
  pushSupported,
  emailSupported,
  hasEmail,
}: {
  pushSupported: boolean;
  emailSupported: boolean;
  hasEmail: boolean;
}) {
  if (pushSupported && emailSupported) return null;

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-xs text-gray-600 leading-relaxed space-y-2">
      <p className="font-medium text-gray-800">🔔 قنوات الإشعارات</p>
      {!pushSupported && (
        <p>
          <span className="font-medium">إشعارات الهاتف:</span> البنية التحتية للإشعار الفوري (Push)
          غير مفعّلة بعد — لن نعرض مفتاحًا وهميًا. تفضيلاتك تُحفظ لما يصير الجاهز.
        </p>
      )}
      {!emailSupported && hasEmail && (
        <p>
          <span className="font-medium">البريد الإلكتروني:</span> حسابك فيه بريد، لكن إرسال
          الإشعارات بالبريد غير مفعّل بعد في النظام.
        </p>
      )}
      {!hasEmail && (
        <p>
          <span className="font-medium">البريد الإلكتروني:</span> أضف بريدًا في الملف الشخصي عندما
          يصبح الإرسال بالبريد متاحًا.
        </p>
      )}
    </div>
  );
}

function PreferencesUnavailable() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center space-y-2">
      <p className="font-semibold text-gray-900">إعدادات الإشعارات غير متاحة</p>
      <p className="text-sm text-gray-600 leading-relaxed">
        API تفضيلات الإشعارات غير مفعّل في هذا البناء.
      </p>
    </div>
  );
}
