'use client';

import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { Button } from '@/components/ui/Button';

export default function DeleteAccountPage() {
  return (
    <AuthGuard>
      <DeleteAccountContent />
    </AuthGuard>
  );
}

function DeleteAccountContent() {
  return (
    <div className="container mx-auto px-4 py-5 pb-24 max-w-lg">
      <SettingsHeader title="حذف الحساب" backHref="/settings" />

      <div className="rounded-2xl border border-error-100 bg-error-50/40 p-5 space-y-4">
        <p className="font-bold text-gray-900">هذا الإجراء نهائي</p>
        <ul className="text-sm text-gray-700 space-y-2 leading-relaxed list-disc list-inside">
          <li>حذف الحساب يزيل وصولك إلى الطلبات والمفضلة من التطبيق.</li>
          <li>سجلات الطلبات السابقة تبقى محفوظة لدى المتجر لأغراض محاسبية وتشغيلية.</li>
          <li>لا يمكن التراجع عن الحذف بعد تنفيذه.</li>
        </ul>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          لا يوفّر النظام حاليًا نقطة API آمنة لحذف الحساب من التطبيق. لطلب حذف حسابك، تواصل مع
          فريق الدعم.
        </p>
        <Link href="/support">
          <Button type="button" variant="outline" className="w-full min-h-[48px]">
            التواصل مع الدعم
          </Button>
        </Link>
      </div>
    </div>
  );
}
