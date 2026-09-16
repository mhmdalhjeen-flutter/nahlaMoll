'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader';
import { CheckoutPageSkeleton } from '@/components/checkout/CheckoutPageSkeleton';
import { CheckoutProductsReview } from '@/components/checkout/CheckoutProductsReview';
import { CheckoutDeliverySummary } from '@/components/checkout/CheckoutDeliverySummary';
import { CheckoutOrderReview } from '@/components/checkout/CheckoutOrderReview';
import { PaymentMethodSection } from '@/components/checkout/PaymentMethodSection';
import { CheckoutPaymentNavFab } from '@/components/checkout/CheckoutPaymentNavFab';
import {
  CheckoutSuccessModal,
  type CheckoutSuccessInfo,
} from '@/components/checkout/CheckoutSuccessModal';
import { DeliverySection } from '@/components/checkout/DeliverySection';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { useValidatedDeliveryArea } from '@/hooks/useValidatedDeliveryArea';
import { useCheckoutStore } from '@/stores/checkout-store';
import { cn, getErrorMessage, isDeliveryAreaNotFound, isStoreClosedError } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';
import { useClosedStoreStore } from '@/stores/closed-store-store';
import { StoreClosedAlert } from '@/components/store/StoreStatus';
import { isCartItemInvalid } from '@/lib/cart-item-utils';
import { recordCustomerEvent } from '@/lib/customer-events';
import {
  ELECTRONIC_PAYMENT_LABELS,
  hasAnyPaymentOption,
  type PaymentMode,
} from '@/lib/payment-config';
import type { ElectronicPaymentMethodKey } from '@/lib/types';

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutContent />
    </AuthGuard>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const qc = useQueryClient();
  const showClosedModal = useClosedStoreStore((s) => s.show);
  const { deliveryAreaId, areasReady, areas, setDeliveryAreaId } = useValidatedDeliveryArea();
  const storedAddress = useCheckoutStore((s) => s.deliveryAddress);
  const storedNotes = useCheckoutStore((s) => s.deliveryNotes);

  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ElectronicPaymentMethodKey | null>(null);
  const [transferAccountName, setTransferAccountName] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [address, setAddress] = useState(storedAddress);
  const [notes, setNotes] = useState(storedNotes);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<CheckoutSuccessInfo | null>(null);

  useEffect(() => {
    if (storedAddress) setAddress(storedAddress);
    if (storedNotes) setNotes(storedNotes);
  }, [storedAddress, storedNotes]);

  useEffect(() => {
    recordCustomerEvent({ type: 'CHECKOUT_STARTED', source: 'checkout' });
  }, []);

  const { data: paymentConfig, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-config'],
    queryFn: storeApi.getPaymentSettings,
  });

  const {
    data: cart,
    isLoading: cartLoading,
    isError: cartError,
    refetch: refetchCart,
  } = useQuery({
    queryKey: ['cart', areasReady ? (deliveryAreaId ?? '') : '__pending__'],
    queryFn: async () => {
      try {
        return await storeApi.getCart(deliveryAreaId ?? undefined);
      } catch (e) {
        if (isDeliveryAreaNotFound(e)) {
          setDeliveryAreaId(null);
          qc.invalidateQueries({ queryKey: ['cart'] });
          return storeApi.getCart();
        }
        throw e;
      }
    },
    enabled: areasReady,
    retry: (failureCount, error) => !isDeliveryAreaNotFound(error) && failureCount < 2,
  });

  const items = cart?.items ?? [];
  const summary = cart?.summary;
  const hasInvalidItems = items.some(isCartItemInvalid);

  useEffect(() => {
    if (successOrder) return;
    if (items.length === 0 && !cartLoading && areasReady) {
      router.replace('/cart');
    }
  }, [items.length, cartLoading, areasReady, router, successOrder]);

  useEffect(() => {
    if (!paymentConfig) return;
    if (paymentMode) return;
    if (paymentConfig.cod.enabled) {
      setPaymentMode('cod');
    } else {
      const methods = Object.entries(paymentConfig.methods).filter(([, v]) => v != null);
      if (methods.length > 0) {
        setPaymentMode('electronic');
        setSelectedMethod(methods[0][0] as ElectronicPaymentMethodKey);
      }
    }
  }, [paymentConfig, paymentMode]);

  const placeOrder = useMutation({
    mutationFn: async () => {
      const order = await storeApi.createOrder({
        deliveryAreaId: deliveryAreaId!,
        deliveryAddress: address.trim(),
        notes: notes.trim() || undefined,
      });

      if (paymentMode === 'electronic') {
        const methodLabel = selectedMethod
          ? ELECTRONIC_PAYMENT_LABELS[selectedMethod]
          : 'تحويل إلكتروني';
        await storeApi.submitPayment(order.id, {
          paymentReference: transferAccountName.trim(),
          paymentNotes: methodLabel,
          paymentProof: paymentProofUrl ?? undefined,
        });
      }

      return order;
    },
    onSuccess: (order) => {
      setSubmitError(null);
      const orderQualifiesForFreeDelivery =
        !!deliveryAreaId && (cart?.summary?.isFreeDelivery ?? false);
      setSuccessOrder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        isFreeDelivery: orderQualifiesForFreeDelivery,
      });
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => {
      if (isStoreClosedError(e)) {
        showClosedModal(
          {
            type: 'CHECKOUT',
            deliveryAreaId: deliveryAreaId!,
            deliveryAddress: address.trim(),
            notes: notes.trim() || undefined,
          },
          'submit',
        );
        setSubmitError(null);
        return;
      }
      const message = getErrorMessage(e);
      setSubmitError(message);
      toast(message, 'error');
    },
  });

  if (cartLoading || !areasReady || paymentLoading) {
    return <CheckoutPageSkeleton />;
  }

  if (cartError) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg">
        <CheckoutHeader />
        <ErrorState
          message="تعذر تحميل بيانات الطلب. حاول مرة أخرى."
          onRetry={() => void refetchCart()}
        />
      </div>
    );
  }

  if (items.length === 0 && !successOrder) return null;

  if (!paymentConfig || !hasAnyPaymentOption(paymentConfig)) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-lg text-center">
        <CheckoutHeader />
        <p className="text-gray-600">طرق الدفع غير متاحة حالياً. يرجى المحاولة لاحقاً.</p>
      </div>
    );
  }

  const subtotal = summary?.subtotal ?? 0;
  const hasDeliveryArea = !!deliveryAreaId;
  const deliveryFee = hasDeliveryArea ? (summary?.deliveryFee ?? 0) : null;
  const total = hasDeliveryArea ? subtotal + (summary?.deliveryFee ?? 0) : subtotal;
  const isFreeDelivery = hasDeliveryArea && (summary?.isFreeDelivery ?? false);

  const electronicValid =
    paymentMode !== 'electronic' ||
    (selectedMethod != null && transferAccountName.trim().length > 0);

  const canSubmit =
    paymentMode != null &&
    electronicValid &&
    !!deliveryAreaId &&
    address.trim().length >= 5 &&
    !hasInvalidItems &&
    !placeOrder.isPending;

  const handleSubmit = () => {
    if (placeOrder.isPending || successOrder) return;
    if (hasInvalidItems) return;
    setSubmitError(null);
    placeOrder.mutate();
  };

  const handlePaymentModeChange = (mode: PaymentMode) => {
    setPaymentMode(mode);
    if (mode === 'electronic' && !selectedMethod) {
      const first = (Object.keys(paymentConfig.methods) as ElectronicPaymentMethodKey[]).find(
        (k) => paymentConfig.methods[k] != null,
      );
      if (first) setSelectedMethod(first);
    }
    if (mode === 'cod') {
      setTransferAccountName('');
      setPaymentProofUrl(null);
    }
  };

  const ctaLabel = 'تأكيد وإرسال الطلب';
  const ctaLoadingLabel = 'جارٍ إرسال الطلب...';

  return (
    <div className="container mx-auto px-4 py-4 max-w-lg lg:max-w-5xl pb-32">
      <CheckoutHeader />
      <CheckoutPaymentNavFab hidden={successOrder != null} />

      <StoreClosedAlert />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
        <div className="space-y-4">
          <DeliverySection
            areas={areas ?? []}
            deliveryAreaId={deliveryAreaId}
            onDeliveryAreaChange={setDeliveryAreaId}
            address={address}
            onAddressChange={setAddress}
            notes={notes}
            onNotesChange={setNotes}
            step={1}
          />

          <div className="lg:hidden space-y-4">
            <CheckoutProductsReview items={items} step={2} />
            <CheckoutDeliverySummary
              deliveryFee={deliveryFee}
              isFreeDelivery={isFreeDelivery}
              hasDeliveryArea={hasDeliveryArea}
              step={3}
            />
          </div>

          <CheckoutOrderReview
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            isFreeDelivery={isFreeDelivery}
            hasDeliveryArea={hasDeliveryArea}
            step={4}
          />

          <PaymentMethodSection
            config={paymentConfig}
            paymentMode={paymentMode}
            onPaymentModeChange={handlePaymentModeChange}
            selectedMethod={selectedMethod}
            onSelectedMethodChange={setSelectedMethod}
            transferAccountName={transferAccountName}
            onTransferAccountNameChange={setTransferAccountName}
            paymentProofUrl={paymentProofUrl}
            onPaymentProofChange={setPaymentProofUrl}
            orderTotal={total}
            step={5}
          />
        </div>

        <aside className="hidden lg:block space-y-4 lg:sticky lg:top-4">
          <CheckoutProductsReview items={items} step={2} />
          <CheckoutDeliverySummary
            deliveryFee={deliveryFee}
            isFreeDelivery={isFreeDelivery}
            hasDeliveryArea={hasDeliveryArea}
            step={3}
          />
        </aside>
      </div>

      {submitError && (
        <p className="text-sm text-error-600 bg-error-50 border border-error-100 rounded-xl px-3 py-2 mt-4" role="alert">
          {submitError}
        </p>
      )}

      <CheckoutSuccessModal
        open={successOrder != null}
        order={successOrder}
      />

      {!deliveryAreaId && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-4 text-center lg:hidden">
          يرجى اختيار منطقة التوصيل لحساب رسوم التوصيل
        </p>
      )}

      <form
        className="fixed bottom-[4.25rem] inset-x-0 z-30 lg:static lg:bottom-auto px-4 lg:px-0 pb-3 lg:pb-0 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent lg:bg-none pt-4 lg:pt-6 mt-4 lg:mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="max-w-lg lg:max-w-none mx-auto">
          {!deliveryAreaId && (
            <p className="hidden lg:block text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-2 text-center">
              يرجى اختيار منطقة التوصيل لحساب رسوم التوصيل
            </p>
          )}
          {hasInvalidItems && (
            <p className="text-xs text-warning-700 bg-warning-50 border border-warning-100 rounded-xl px-3 py-2 mb-2 text-center" role="alert">
              يوجد منتج يحتاج إلى مراجعة قبل تأكيد الطلب.
            </p>
          )}
          <Button
            type="submit"
            className={cn(
              'w-full min-h-[48px] text-base shadow-lg lg:shadow-none btn-cta',
              'inline-flex items-center justify-center gap-2',
            )}
            size="lg"
            disabled={!canSubmit || !!successOrder}
            aria-busy={placeOrder.isPending}
          >
            {placeOrder.isPending && (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
            )}
            {placeOrder.isPending ? ctaLoadingLabel : ctaLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
