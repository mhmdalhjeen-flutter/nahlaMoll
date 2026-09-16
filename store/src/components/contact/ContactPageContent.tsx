'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MessageCircle, Phone } from 'lucide-react';
import { storeApi } from '@/lib/store-api';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { buildTelUrl } from '@/lib/contact';
import { useShellUi } from '@/components/layout/ShellUiContext';
import { ContactCard } from '@/components/contact/ContactCard';
import { WhatsAppIcon } from '@/components/contact/WhatsAppIcon';
import { ErrorState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export function ContactPageContent() {
  const router = useRouter();
  const { setChatbotOpen } = useShellUi();

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-settings'],
    queryFn: storeApi.getPublicSettings,
    staleTime: 5 * 60 * 1000,
  });

  const whatsappUrl = buildWhatsAppUrl(settings?.storePhone);
  const telUrl = buildTelUrl(settings?.storePhone);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/settings');
  };

  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-lg">
      <header className="mb-6">
        <div className="flex items-center gap-2 min-h-[44px]">
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              'shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl',
              'text-primary-700 hover:bg-primary-50 transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            )}
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5" aria-hidden />
          </button>
          <h1 className="text-xl font-bold text-gray-900">تواصل معنا</h1>
        </div>
        <p className="text-sm text-gray-600 mt-2 pr-1 leading-relaxed">إحنا موجودين لمساعدتك.</p>
      </header>

      {isLoading ? (
        <ContactPageSkeleton />
      ) : isError ? (
        <div className="space-y-4">
          <ErrorState message="تعذر تحميل معلومات التواصل" onRetry={() => refetch()} />
          <ContactCard
            accent="chatbot"
            icon={MessageCircle}
            title="اسأل نحلة مول"
            description="ممكن يساعدك فورًا في كثير من الأمور."
            actionLabel="اسأل الآن"
            ariaLabel="اسأل نحلة مول — فتح المساعد"
            onClick={() => setChatbotOpen(true)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {whatsappUrl && (
            <ContactCard
              accent="whatsapp"
              icon={WhatsAppIcon}
              title="واتساب"
              description="راسلنا مباشرة."
              actionLabel="ابدأ المحادثة"
              href={whatsappUrl}
              external
              ariaLabel="تواصل معنا عبر واتساب — ابدأ المحادثة"
            />
          )}

          {telUrl && (
            <ContactCard
              accent="phone"
              icon={Phone}
              title="اتصال"
              description="تواصل معنا عبر الهاتف."
              actionLabel="اتصال"
              href={telUrl}
              ariaLabel="اتصال هاتفي بالمتجر"
            />
          )}

          <ContactCard
            accent="chatbot"
            icon={MessageCircle}
            title="اسأل نحلة مول"
            description="ممكن يساعدك فورًا في كثير من الأمور."
            actionLabel="اسأل الآن"
            ariaLabel="اسأل نحلة مول — فتح المساعد"
            onClick={() => setChatbotOpen(true)}
          />

          {!whatsappUrl && !telUrl && (
            <p className="text-xs text-gray-500 text-center pt-2 leading-relaxed">
              رقم التواصل غير مُعدّ حاليًا في إعدادات المتجر — يمكنك استخدام المساعد أو صفحة الدعم.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ContactPageSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}
