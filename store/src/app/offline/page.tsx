'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OfflinePage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4 text-brand-secondary">
        <WifiOff className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">لا يوجد اتصال بالإنترنت حاليًا</h1>
      <p className="text-sm text-gray-600 max-w-sm mb-6">
        تحقق من اتصالك ثم أعد المحاولة. بعض الصفحات التي زرتها سابقًا قد تظهر من الذاكرة المؤقتة،
        لكن بيانات المتجر والطلبات تتطلب اتصالًا بالإنترنت.
      </p>
      <Button type="button" onClick={() => window.location.reload()}>
        إعادة المحاولة
      </Button>
    </main>
  );
}
