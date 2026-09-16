'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCartMap } from '@/hooks/useCartMap';
import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { FreeDeliveryProgressFab } from './FreeDeliveryProgressFab';
import { shouldShowFreeDeliveryFab } from '@/lib/free-delivery-fab';

function isCartPath(pathname: string) {
  return pathname === '/cart';
}

function isCheckoutPath(pathname: string) {
  return pathname === '/checkout';
}

function isAllCategoriesPath(pathname: string) {
  return pathname === '/categories/all';
}

/** Routes where legacy WhatsApp FAB stays hidden (unchanged rules). */
function hideWhatsAppFab(pathname: string) {
  return isCartPath(pathname) || isCheckoutPath(pathname) || isAllCategoriesPath(pathname);
}

/**
 * Shows Free Delivery Progress Circle when the customer has cart items,
 * otherwise falls back to WhatsApp in the same anchor position.
 */
export function FloatingCommerceAssistants() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { summary } = useCartMap();

  const hasCartItems = isAuthenticated && (summary?.totalItems ?? 0) > 0;
  const showProgressFab = hasCartItems && shouldShowFreeDeliveryFab(pathname);
  const showWhatsApp = !showProgressFab && !hideWhatsAppFab(pathname);

  return (
    <>
      {showProgressFab && <FreeDeliveryProgressFab />}
      <WhatsAppButton hidden={!showWhatsApp} />
    </>
  );
}
