'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn, formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useCartMap } from '@/hooks/useCartMap';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useToastStore } from '@/stores/toast-store';
import {
  buildFreeDeliveryFabView,
  getFreeDeliveryFabStageToast,
  shouldNotifyFreeDeliveryStageChange,
  shouldShowFreeDeliveryFab,
  type FreeDeliveryFabStage,
  type FreeDeliveryFabViewModel,
} from '@/lib/free-delivery-fab';
import { DESKTOP_FAB_BOTTOM, mobileFabBottomClass } from '@/lib/fab-layout';
import { FreeDeliveryProgressDetailModal } from './FreeDeliveryProgressDetailModal';

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProgressRingProps {
  pct: number;
  view: FreeDeliveryFabViewModel;
  playCompletePulse: boolean;
}

function ProgressRing({ pct, view, playCompletePulse }: ProgressRingProps) {
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <svg
      className={cn(
        'absolute inset-0 -rotate-90 w-full h-full',
        playCompletePulse && 'animate-fab-complete-pulse',
      )}
      viewBox="0 0 64 64"
      aria-hidden
    >
      <circle
        cx="32"
        cy="32"
        r={RADIUS}
        fill="none"
        className="stroke-gray-200"
        strokeWidth="5"
      />
      <circle
        cx="32"
        cy="32"
        r={RADIUS}
        fill="none"
        className={cn(view.strokeClass, 'transition-[stroke-dashoffset] duration-500 ease-out')}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function FreeDeliveryProgressFab() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { summary } = useCartMap();
  const toast = useToastStore((s) => s.show);
  const [modalOpen, setModalOpen] = useState(false);
  const [playCompletePulse, setPlayCompletePulse] = useState(false);
  const prevStageRef = useRef<FreeDeliveryFabStage | null>(null);
  const initializedRef = useRef(false);

  const hasCartItems = isAuthenticated && (summary?.totalItems ?? 0) > 0;
  const view = buildFreeDeliveryFabView(summary);
  const visible = hasCartItems && view && shouldShowFreeDeliveryFab(pathname);

  const animatedPct = useAnimatedNumber(view?.displayPct ?? 0);
  const displayPctRounded = Math.round(animatedPct);
  const displaySubtotal = formatPrice(view?.subtotal ?? 0);

  useEffect(() => {
    if (!view) {
      prevStageRef.current = null;
      initializedRef.current = false;
      return;
    }

    if (!initializedRef.current) {
      prevStageRef.current = view.stage;
      initializedRef.current = true;
      return;
    }

    const prev = prevStageRef.current;
    const next = view.stage;

    if (shouldNotifyFreeDeliveryStageChange(prev, next, false)) {
      const toastPayload = getFreeDeliveryFabStageToast(view);
      if (toastPayload) {
        toast(toastPayload.message, toastPayload.type, undefined, 'top');
      }

      if (next === 'complete') {
        setPlayCompletePulse(true);
        const timer = window.setTimeout(() => setPlayCompletePulse(false), 650);
        prevStageRef.current = next;
        return () => window.clearTimeout(timer);
      }
    }

    prevStageRef.current = next;
    return undefined;
  }, [view, toast]);

  if (!visible || !view) return null;

  return (
    <>
      <div
        className={cn(
          'fixed z-30 left-3 md:left-6',
          mobileFabBottomClass(pathname),
          DESKTOP_FAB_BOTTOM,
        )}
      >
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label={`تقدّم التوصيل المجاني ${displayPctRounded}% — مجموع الشراء ${displaySubtotal} شيكل`}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-full bg-white shadow-lg border',
            'touch-manipulation active:scale-[0.97] motion-reduce:transform-none',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
            'w-[62px] h-[62px] md:w-[72px] md:h-[72px]',
            view.ringClass,
          )}
        >
          <ProgressRing pct={animatedPct} view={view} playCompletePulse={playCompletePulse} />

          <div className="relative z-[1] flex flex-col items-center justify-center leading-none pointer-events-none">
            <span
              className={cn(
                'font-bold tabular-nums text-sm md:text-base',
                view.stage === 'complete' ? 'text-success-700' : 'text-navy-900',
              )}
            >
              {displayPctRounded}%
            </span>
            <span className="text-[9px] md:text-[10px] font-semibold tabular-nums text-gray-600 mt-0.5">
              {displaySubtotal} ₪
            </span>
          </div>
        </button>
      </div>

      <FreeDeliveryProgressDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        view={view}
      />
    </>
  );
}
