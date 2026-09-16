export const CHECKOUT_PAYMENT_DETAILS_ID = 'checkout-payment-details';

/** Smoothly scroll the payment details card into a comfortable viewport position. */
export function scrollToPaymentDetails(): void {
  if (typeof document === 'undefined') return;

  const el = document.getElementById(CHECKOUT_PAYMENT_DETAILS_ID);
  if (!el) return;

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}

/** Wait for React to paint the details card before scrolling. */
export function scrollToPaymentDetailsAfterRender(): void {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollToPaymentDetails();
    });
  });
}
