'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { SettingsHeader } from '@/components/settings/SettingsHeader';

const SECTIONS = [
  {
    title: 'البيانات التي نجمعها',
    body: 'نجمع معلومات الحساب الأساسية (الاسم، رقم الهاتف) وبيانات الطلبات والتوصيل اللازمة لإتمام الشراء.',
  },
  {
    title: 'كيف نستخدم بياناتك',
    body: 'تُستخدم بياناتك لتجهيز الطلبات، التواصل معك بخصوص الطلب، وتحسين تجربة التسوق. لا نبيع بياناتك لأطراف ثالثة.',
  },
  {
    title: 'الاحتفاظ بالبيانات',
    body: 'سجلات الطلبات والفواتير تُحفظ لأغراض تجارية ومحاسبية حتى بعد حذف الحساب، وفق سياسة المتجر.',
  },
  {
    title: 'حقوقك',
    body: 'يمكنك تحديث اسمك من الملف الشخصي، والتواصل مع الدعم لأي استفسار حول بياناتك.',
  },
];

export default function SettingsPrivacyPage() {
  return (
    <AuthGuard>
      <PrivacyContent />
    </AuthGuard>
  );
}

function PrivacyContent() {
  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-lg">
      <SettingsHeader title="الخصوصية والبيانات" backHref="/settings" />

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <section key={section.title} className="rounded-2xl border border-gray-100 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2">{section.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
