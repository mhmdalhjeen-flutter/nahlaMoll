'use client';

import { ShoppingBag, Package, Target, Heart } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { DeliveryArea } from '@/lib/types';
import { DeliveryScooterIcon } from '@/components/icons/DeliveryScooterIcon';
import { DeliveryAreasTree } from '@/components/delivery/DeliveryAreasTree';

const HOW_STEPS = [
  {
    icon: ShoppingBag,
    title: 'اشتري على راحتك',
    text: 'اختار واطلب اللي بدك إياه.',
  },
  {
    icon: Package,
    title: 'كل غرض بقربك من التوصيل المجاني',
    text: 'كل منتج ممكن يقربك أكثر من التوصيل المجاني.',
    example: '+40%',
  },
  {
    icon: Target,
    title: 'كمّلها لـ100%',
    text: 'لما توصل للحد المطلوب، التوصيل علينا.',
  },
];

interface FreeDeliveryHowItWorksModalProps {
  open: boolean;
  onClose: () => void;
  onExplained?: () => void;
}

export function FreeDeliveryHowItWorksModal({
  open,
  onClose,
  onExplained,
}: FreeDeliveryHowItWorksModalProps) {
  const handleClose = () => {
    onExplained?.();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="كيف بتكسب التوصيل المجاني؟">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-cta-600">
          <DeliveryScooterIcon className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium text-gray-700">ميزة من المتجر — مو رسوم إضافية</p>
        </div>

        {HOW_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-600" aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary-600 font-bold mb-0.5">الخطوة {i + 1}</p>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{step.title}</p>
                <p className="text-sm text-gray-600">{step.text}</p>
                {step.example && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-cta-700 bg-primary-50 border border-primary-100 rounded-lg px-2 py-1">
                    <DeliveryScooterIcon className="w-3.5 h-3.5" accentClassName="text-cta-600" />
                    منتج {step.example} للتوصيل المجاني
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-sm text-gray-600 text-center leading-relaxed px-1">
          <span className="inline-flex items-center gap-1 justify-center flex-wrap">
            <Heart className="w-4 h-4 text-primary-500 fill-primary-500 shrink-0" aria-hidden />
            اشتري وإنت مرتاح، وما تحمل هم التوصيل من اليوم وطالع
          </span>
        </p>

        <Button className="w-full min-h-[48px]" onClick={handleClose}>
          فهمت، شكراً!
        </Button>
      </div>
    </Modal>
  );
}

interface FreeDeliveryAreasModalProps {
  open: boolean;
  onClose: () => void;
  areas: DeliveryArea[];
  areasLoading: boolean;
}

export function FreeDeliveryAreasModal({
  open,
  onClose,
  areas,
  areasLoading,
}: FreeDeliveryAreasModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="مناطق التوصيل المجاني"
      subtitle="جميع مناطق التوصيل المتاحة — المؤهلة تظهر أدناه"
    >
      <div className="space-y-2">
        {areasLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}
        {!areasLoading && areas.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            لا توجد مناطق توصيل متاحة حالياً
          </p>
        )}
        {!areasLoading && <DeliveryAreasTree areas={areas.filter((a) => a.isActive)} />}
        <Button variant="secondary" className="w-full min-h-[44px] mt-2" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </Modal>
  );
}

export function FreeDeliveryModals({
  howOpen,
  onHowClose,
  areasOpen,
  onAreasClose,
  areas,
  areasLoading,
  onExplained,
}: {
  howOpen: boolean;
  onHowClose: () => void;
  areasOpen: boolean;
  onAreasClose: () => void;
  areas: DeliveryArea[];
  areasLoading: boolean;
  onExplained?: () => void;
}) {
  return (
    <>
      <FreeDeliveryHowItWorksModal
        open={howOpen}
        onClose={onHowClose}
        onExplained={onExplained}
      />
      <FreeDeliveryAreasModal
        open={areasOpen}
        onClose={onAreasClose}
        areas={areas}
        areasLoading={areasLoading}
      />
    </>
  );
}
