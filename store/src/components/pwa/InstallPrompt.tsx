'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_TTL_MS;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDismissedRecently()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setInstalling(false);
      setVisible(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-install-title"
      className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[55] mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-lg md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-brand-surface p-2 text-brand-secondary">
          <Download className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="pwa-install-title" className="text-sm font-bold text-gray-900">
            ثبّت تطبيق نحلة مول
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            أضف المتجر إلى شاشتك الرئيسية لتجربة أسرع وأكثر راحة.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={installing} onClick={install}>
              تثبيت التطبيق
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              لاحقًا
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
