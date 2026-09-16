'use client';

import { StoreShell } from '@/components/layout/StoreShell';
import { ToastContainer } from '@/components/ui/Toast';
import { StoreClosedModal } from '@/components/store/StoreClosedModal';
import { StoreWaitNotifier } from '@/components/store/StoreWaitNotifier';
import { ClosedStoreSessionReset } from '@/components/store/ClosedStoreSessionReset';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AuthBottomSheet } from '@/components/auth/AuthBottomSheet';
import { PendingAuthActionResume } from '@/components/auth/PendingAuthActionResume';
import { AnnouncementProvider } from '@/components/announcements/AnnouncementProvider';
import { PwaProvider } from '@/components/pwa/PwaProvider';
import { NetworkStatusBanner } from '@/components/pwa/NetworkStatusBanner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PwaProvider>
      <AuthProvider>
        <AnnouncementProvider>
          <NetworkStatusBanner />
          <PendingAuthActionResume />
          <AuthBottomSheet />
          <StoreShell>{children}</StoreShell>
          <InstallPrompt />
          <StoreClosedModal />
          <ClosedStoreSessionReset />
          <StoreWaitNotifier />
          <ToastContainer />
        </AnnouncementProvider>
      </AuthProvider>
    </PwaProvider>
  );
}
