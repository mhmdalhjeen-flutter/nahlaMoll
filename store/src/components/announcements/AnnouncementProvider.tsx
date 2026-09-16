'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/lib/store-api';
import type { Announcement } from '@/lib/types';
import {
  markAnnouncementSeenToday,
  pickDailyAnnouncement,
} from '@/lib/announcement-daily';
import { AnnouncementPopup } from '@/components/announcements/AnnouncementPopup';

let announcementSessionChecked = false;

/**
 * Loads active announcements once on app startup and shows the highest-priority
 * unseen announcement for the current calendar day.
 */
export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);
  const hasPresentedRef = useRef(false);

  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: storeApi.getAnnouncements,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (announcementSessionChecked || hasPresentedRef.current || data === undefined) return;

    hasPresentedRef.current = true;
    announcementSessionChecked = true;

    const candidate = data.length ? pickDailyAnnouncement(data) : null;
    if (!candidate) return;

    setAnnouncement(candidate);
    setOpen(true);
  }, [data]);

  const handleClose = () => {
    if (announcement) {
      markAnnouncementSeenToday(announcement.id);
    }
    setOpen(false);
  };

  return (
    <>
      {children}
      <AnnouncementPopup open={open} announcement={announcement} onClose={handleClose} />
    </>
  );
}
