'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useAuthStore } from '@/stores/auth-store';
import { useCartMap } from '@/hooks/useCartMap';
import { cn, formatPrice } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MapPin } from 'lucide-react';

import { ScooterProgress } from '@/components/home/ScooterProgress';
import { formatProgressPercent } from '@/lib/free-delivery';
import { FREE_DELIVERY_PROGRESS_TARGET } from '@/lib/delivery.constants';

const STEPS = [
  { emoji: '🛒', text: 'اطلب منتجات مشاركة في التوصيل المجاني.' },
  { emoji: '📦', text: 'كل منتج يساهم بنسبة مئوية في تقدمك.' },
  { emoji: '🎯', text: 'عند الوصول إلى 95% أو أكثر تحصل على توصيل مجاني.' },
  { emoji: '🎉', text: 'استمتع بالتوصيل المجاني — ميزة من المتجر!' },
];

function CompactLinkButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-primary-200/80 bg-white/80 px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-primary-700 hover:bg-primary-50 hover:border-primary-300 active:scale-95 transition-all touch-manipulation whitespace-nowrap"
    >
      {children}
    </button>
  );
}

export function FreeDeliverySection() {
  const [howModalOpen, setHowModalOpen] = useState(false);
  const [areasModalOpen, setAreasModalOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { summary: cartSummary } = useCartMap();

  const { data: deliveryAreas, isLoading: areasLoading } = useQuery({
    queryKey: ['delivery-areas'],
    queryFn: storeApi.getDeliveryAreas,
    enabled: areasModalOpen,
    staleTime: 5 * 60 * 1000,
  });

  const freeAreas = (deliveryAreas ?? []).filter((a) => a.eligibleForFreeDelivery && a.isActive);

  const target = FREE_DELIVERY_PROGRESS_TARGET;
  const displayed = cartSummary?.displayedScore ?? 0;
  const remaining = cartSummary?.remainingScore ?? Math.max(0, target - displayed);
  const pct = Math.min(100, cartSummary?.progressPercentage ?? 0);
  const achieved = cartSummary?.isFreeDelivery ?? false;

  return (
    <>
      <section className="container mx-auto px-4 pt-1 pb-1 max-w-6xl">
        <div
          className={cn(
            'rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-300',
            achieved
              ? 'bg-gradient-to-l from-success-50 to-white border-success-200 shadow-sm'
              : 'bg-white border-primary-100 shadow-card',
          )}
        >
          {achieved ? (
            <p className="text-sm sm:text-base font-bold text-success-700 animate-in fade-in">
              مبارك! لقد حصلت على التوصيل المجاني 🎉
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-900 mb-0.5">تقدم التوصيل المجاني</p>
              <ScooterProgress displayed={displayed} target={target} achieved={achieved} pct={pct} className="mb-1" />
              <div className="flex justify-between text-[10px] sm:text-xs text-gray-600 mt-1 tabular-nums">
                <span>{formatProgressPercent(pct)}</span>
                {remaining > 0 && <span>متبقي {formatProgressPercent(remaining)}</span>}
              </div>
            </>
          )}

          <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
            {achieved
              ? 'استمتع بتوصيل مجاني على طلبك القادم المؤهل.'
              : 'اجمع 95% من مساهمة المنتجات للحصول على توصيل مجاني.'}
            {!isAuthenticated && !achieved && ' سجّل الدخول لتتبع تقدمك.'}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <CompactLinkButton onClick={() => setHowModalOpen(true)}>
              كيف أحصل على توصيل مجاني
            </CompactLinkButton>
            <CompactLinkButton onClick={() => setAreasModalOpen(true)}>
              المناطق المجانية
            </CompactLinkButton>
          </div>
        </div>
      </section>

      <Modal open={howModalOpen} onClose={() => setHowModalOpen(false)} title="كيف أحصل على توصيل مجاني؟">
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="text-2xl shrink-0">{step.emoji}</span>
              <div>
                <p className="text-xs text-primary-600 font-bold mb-0.5">الخطوة {i + 1}</p>
                <p className="text-sm text-gray-800">{step.text}</p>
              </div>
            </div>
          ))}
          <Button className="w-full min-h-[48px]" onClick={() => setHowModalOpen(false)}>
            فهمت، شكراً!
          </Button>
        </div>
      </Modal>

      <Modal
        open={areasModalOpen}
        onClose={() => setAreasModalOpen(false)}
        title="المناطق المجانية"
        subtitle="المناطق المؤهلة للتوصيل المجاني عند إكمال الهدف"
      >
        <div className="space-y-2">
          {areasLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}
          {!areasLoading && freeAreas.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              لا توجد مناطق مؤهلة للتوصيل المجاني حالياً
            </p>
          )}
          {!areasLoading &&
            freeAreas.map((area) => (
              <div
                key={area.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{area.name}</p>
                  <p className="text-[11px] text-gray-500">
                    رسوم التوصيل: {formatPrice(area.deliveryFee)} ₪ — تُلغى عند إكمال الهدف 🎉
                  </p>
                </div>
              </div>
            ))}
          <Button
            variant="secondary"
            className="w-full min-h-[44px] mt-2"
            onClick={() => setAreasModalOpen(false)}
          >
            إغلاق
          </Button>
        </div>
      </Modal>
    </>
  );
}
