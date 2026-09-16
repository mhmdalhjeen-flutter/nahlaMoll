'use client';

import Image from 'next/image';
import { Megaphone, X } from 'lucide-react';
import { useEffect } from 'react';
import type { Announcement } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { getOptimizedImageUrl } from '@/lib/image-url';

interface AnnouncementPopupProps {
  open: boolean;
  announcement: Announcement | null;
  onClose: () => void;
}

export function AnnouncementPopup({ open, announcement, onClose }: AnnouncementPopupProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !announcement) return null;

  return (
    <div className="fixed inset-0 z-[45] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="إغلاق الإعلان"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        {announcement.image ? (
          <div className="relative w-full bg-gradient-to-b from-primary-50 to-white">
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[42vh]">
              <Image
                src={getOptimizedImageUrl(announcement.image, 'banner')}
                alt={announcement.title}
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 100vw, 448px"
                priority
              />
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-l from-navy-700 to-navy-600 px-5 py-6 text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Megaphone className="w-6 h-6" />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 p-2 rounded-full bg-black/35 text-white hover:bg-black/50 transition-colors backdrop-blur-sm"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-xs font-semibold text-navy-600 mb-1">إعلان من نحلة مول</p>
          <h2 id="announcement-title" className="text-xl font-bold text-gray-900 leading-snug mb-3">
            {announcement.title}
          </h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-[15px]">
            {announcement.content}
          </p>
          <Button className="w-full min-h-[48px] mt-6" onClick={onClose}>
            حسناً
          </Button>
        </div>
      </div>
    </div>
  );
}
