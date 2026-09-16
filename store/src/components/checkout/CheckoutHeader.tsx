'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutHeaderProps {
  className?: string;
}

export function CheckoutHeader({ className }: CheckoutHeaderProps) {
  return (
    <header className={cn('flex items-center gap-2 mb-5', className)}>
      <Link
        href="/cart"
        className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="العودة إلى السلة"
      >
        <ChevronRight className="w-5 h-5" aria-hidden />
      </Link>
      <h1 className="text-xl font-bold text-gray-900 leading-tight">تأكيد الطلب</h1>
    </header>
  );
}
