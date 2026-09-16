'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminAuthProvider } from '@/components/auth/AdminAuthProvider';
import { ToastBar } from '@/components/ui/ToastBar';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        {children}
      </AdminAuthProvider>
      <ToastBar />
    </QueryClientProvider>
  );
}
