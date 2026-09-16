'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { WhatsAppIcon } from '@/components/contact/WhatsAppIcon';
import { cn } from '@/lib/utils';
import { DESKTOP_FAB_BOTTOM, mobileFabBottomClass } from '@/lib/fab-layout';

export function WhatsAppButton({ hidden }: { hidden?: boolean }) {
  const pathname = usePathname();
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: storeApi.getPublicSettings,
    staleTime: 5 * 60 * 1000,
  });

  const whatsappUrl = buildWhatsAppUrl(settings?.storePhone);
  if (!whatsappUrl || hidden) return null;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      className={cn(
        'fixed z-30 flex items-center justify-center rounded-full shadow-md transition-all',
        'bg-[#25D366]/90 text-white hover:bg-[#25D366] active:scale-95',
        'w-10 h-10 min-w-[40px] min-h-[40px] md:w-11 md:h-11',
        'left-4 md:left-6',
        mobileFabBottomClass(pathname),
        DESKTOP_FAB_BOTTOM,
      )}
    >
      <WhatsAppIcon className="w-[18px] h-[18px] md:w-5 md:h-5 shrink-0" />
    </a>
  );
}
