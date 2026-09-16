'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useShellUi } from '@/components/layout/ShellUiContext';
import { ChatbotDialog } from './ChatbotDialog';
import { DESKTOP_FAB_BOTTOM, mobileFabBottomClass } from '@/lib/fab-layout';

interface ChatbotFabProps {
  hidden?: boolean;
}

export function ChatbotFab({ hidden }: ChatbotFabProps) {
  const pathname = usePathname();
  const { chatbotOpen, setChatbotOpen } = useShellUi();

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        data-testid="chatbot-fab"
        onClick={() => setChatbotOpen(true)}
        className={cn(
          'fixed z-30 flex items-center justify-center rounded-full shadow-md',
          'bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98]',
          'w-11 h-11 min-w-[44px] min-h-[44px] motion-reduce:transform-none',
          'right-4 md:right-6',
          mobileFabBottomClass(pathname),
          DESKTOP_FAB_BOTTOM,
        )}
        aria-label="اسأل نحلة مول"
      >
        <span className="text-2xl leading-none select-none" aria-hidden>
          😇
        </span>
      </button>

      <ChatbotDialog open={chatbotOpen} onClose={() => setChatbotOpen(false)} />
    </>
  );
}
