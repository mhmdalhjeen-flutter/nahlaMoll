'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_SECTION_ID = 'checkout-payment';

interface CheckoutPaymentNavFabProps {
  hidden?: boolean;
  className?: string;
}

/**
 * Subtle top-side hint that scrolls to the payment section during checkout.
 * Hidden once the payment section enters the viewport.
 */
export function CheckoutPaymentNavFab({ hidden, className }: CheckoutPaymentNavFabProps) {
  const [paymentInView, setPaymentInView] = useState(false);

  useEffect(() => {
    const paymentEl = document.getElementById(PAYMENT_SECTION_ID);
    if (!paymentEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPaymentInView(entry.isIntersecting);
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(paymentEl);
    return () => observer.disconnect();
  }, []);

  const scrollToPayment = () => {
    const paymentEl = document.getElementById(PAYMENT_SECTION_ID);
    if (!paymentEl) return;
    paymentEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (hidden || paymentInView) return null;

  return (
    <div
      className={cn(
        'fixed z-20 pointer-events-none',
        'left-3 sm:left-4',
        'top-[calc(env(safe-area-inset-top,0px)+4.75rem)]',
        'lg:top-6 lg:left-[max(1rem,calc((100vw-64rem)/2+1rem))]',
        className,
      )}
    >
      <button
        type="button"
        onClick={scrollToPayment}
        className={cn(
          'pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'bg-white/80 backdrop-blur-sm border border-primary-100/80 shadow-sm',
          'text-xs font-medium text-primary-700/90',
          'hover:bg-white hover:border-primary-200 hover:text-primary-800',
          'transition-colors duration-200 touch-manipulation',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
          'animate-checkout-payment-hint motion-reduce:animate-none',
        )}
        aria-label="الانتقال إلى قسم طريقة الدفع"
      >
        <ChevronDown className="w-3.5 h-3.5 text-primary-400/90 shrink-0" aria-hidden />
        <span>طريقة الدفع</span>
      </button>
    </div>
  );
}
