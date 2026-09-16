'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { MobileSearchPanel, DesktopSearchPanel } from './MobileSearchPanel';
import { SideMenu } from './SideMenu';
import { FloatingCommerceAssistants } from '@/components/free-delivery/FloatingCommerceAssistants';
import { ChatbotFab } from '@/components/chatbot/ChatbotFab';
import { AppHeader } from './AppHeader';
import { ShellUiProvider } from './ShellUiContext';
import { MobileBottomNav } from './MobileBottomNav';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { useValidatedDeliveryArea } from '@/hooks/useValidatedDeliveryArea';
import { FirstDeliveryAreaModal } from '@/components/cart/FirstDeliveryAreaModal';
import { cn } from '@/lib/utils';

function GlobalShellOverlays() {
  return (
    <>
      <MobileSearchPanel />
      <DesktopSearchPanel />
      <SideMenu />
    </>
  );
}

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 safe-area-top surface-header-primary h-12 md:h-[4.75rem]" />
  );
}

function FirstAddDeliveryGate() {
  const { areas, areasReady } = useValidatedDeliveryArea();
  const { data: fetchedAreas, isLoading } = useQuery({
    queryKey: ['delivery-areas'],
    queryFn: storeApi.getDeliveryAreas,
    staleTime: 5 * 60 * 1000,
  });
  const modalAreas = fetchedAreas ?? areas;
  return (
    <FirstDeliveryAreaModal
      areas={modalAreas}
      areasLoading={!areasReady || isLoading}
    />
  );
}

function isProductDetailPath(pathname: string) {
  return /^\/products\/[^/]+$/.test(pathname);
}

function isCheckoutPath(pathname: string) {
  return pathname === '/checkout';
}

function isCartPath(pathname: string) {
  return pathname === '/cart';
}

function isAllCategoriesPath(pathname: string) {
  return pathname === '/categories/all';
}

/** Routes where chatbot FAB must not render. */
function hideFloatingAssistants(pathname: string) {
  return isCartPath(pathname) || isCheckoutPath(pathname) || isAllCategoriesPath(pathname);
}

/** Routes where free-delivery / WhatsApp commerce floats must not render. */
function hideCommerceFloats(pathname: string) {
  return isCheckoutPath(pathname) || isAllCategoriesPath(pathname);
}

function StoreShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const compactProductPage = isProductDetailPath(pathname);
  const checkoutPage = isCheckoutPath(pathname);
  const allCategoriesPage = isAllCategoriesPath(pathname);
  const noFloatingAssistants = hideFloatingAssistants(pathname);
  const minimalChrome = compactProductPage || checkoutPage || allCategoriesPage;

  return (
    <div
      className={cn(
        'flex flex-col overflow-x-hidden surface-page',
        allCategoriesPage ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-screen',
      )}
    >
      {!minimalChrome && (
        <Suspense fallback={<HeaderFallback />}>
          <AppHeader />
        </Suspense>
      )}
      <GlobalShellOverlays />
      <main
        className={cn(
          'flex-1 min-h-0',
          allCategoriesPage && 'flex flex-col overflow-hidden h-full pb-0',
          minimalChrome && !allCategoriesPage
            ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8'
            : !allCategoriesPage && 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0',
        )}
      >
        {children}
      </main>
      {!compactProductPage && !allCategoriesPage && <MobileBottomNav />}
      {!compactProductPage && !noFloatingAssistants && <ChatbotFab />}
      {!hideCommerceFloats(pathname) && <FloatingCommerceAssistants />}
      <FirstAddDeliveryGate />
    </div>
  );
}

export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellUiProvider>
      <StoreShellInner>{children}</StoreShellInner>
    </ShellUiProvider>
  );
}
