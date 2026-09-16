'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { isAnimatedImageUrl } from '@/lib/image-url';
import { cn } from '@/lib/utils';

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  isRecommended?: boolean;
  hasActiveOffer?: boolean;
}

export function ProductImageGallery({
  images,
  alt,
  isRecommended,
  hasActiveOffer,
}: ProductImageGalleryProps) {
  const galleryImages = useMemo(
    () => images.filter((url) => url?.trim()),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  const activeImage = galleryImages[activeIndex];
  const hasMultiple = galleryImages.length > 1;
  const totalImages = galleryImages.length;

  const goTo = useCallback(
    (index: number) => {
      if (galleryImages.length === 0) return;
      const next = ((index % galleryImages.length) + galleryImages.length) % galleryImages.length;
      setActiveIndex(next);
    },
    [galleryImages.length],
  );

  useEffect(() => {
    if (activeIndex >= galleryImages.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, galleryImages.length]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'ArrowLeft') goTo(activeIndex + 1);
      if (e.key === 'ArrowRight') goTo(activeIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, activeIndex, goTo]);

  if (galleryImages.length === 0) {
    return (
      <div className="aspect-square rounded-2xl border border-slate-200/90 bg-white shadow-card flex items-center justify-center">
        <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-50/80 text-gray-400 text-sm m-2 sm:m-3">
          بدون صورة
        </div>
      </div>
    );
  }

  const badgeCount = (isRecommended ? 1 : 0) + (hasActiveOffer ? 1 : 0);

  return (
    <>
      <div className="relative md:flex md:gap-4 md:items-start">
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-card p-2 sm:p-3">
            <button
              type="button"
              className="relative w-full aspect-square bg-slate-50/90 rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              onClick={() => setFullscreen(true)}
              aria-label={`عرض صورة ${alt} بحجم أكبر`}
            >
              {!loaded[activeIndex] && (
                <div className="absolute inset-0 skeleton motion-reduce:animate-none" aria-hidden />
              )}
              {isAnimatedImageUrl(activeImage) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImage}
                  alt={alt}
                  className={cn(
                    'absolute inset-0 w-full h-full object-contain p-3 sm:p-4 transition-opacity duration-300',
                    loaded[activeIndex] ? 'opacity-100' : 'opacity-0',
                  )}
                  onLoad={() => setLoaded((prev) => ({ ...prev, [activeIndex]: true }))}
                />
              ) : (
                <OptimizedImage
                  src={activeImage}
                  alt={alt}
                  variant="detail"
                  fill
                  priority
                  className={cn(
                    'object-contain p-3 sm:p-4 transition-opacity duration-300 motion-reduce:transition-none',
                    loaded[activeIndex] ? 'opacity-100' : 'opacity-0',
                  )}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onLoad={() => setLoaded((prev) => ({ ...prev, [activeIndex]: true }))}
                />
              )}
              {hasMultiple && (
              <div
                className="absolute inset-x-0 top-0 bottom-0 md:hidden"
                aria-hidden
                onTouchStart={(e) => {
                  e.stopPropagation();
                  const touch = e.touches[0];
                  (e.currentTarget as HTMLElement & { _x?: number })._x = touch.clientX;
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  const el = e.currentTarget as HTMLElement & { _x?: number };
                  const startX = el._x;
                  if (startX == null) return;
                  const endX = e.changedTouches[0].clientX;
                  const delta = endX - startX;
                  if (Math.abs(delta) < 40) return;
                  if (delta < 0) goTo(activeIndex + 1);
                  else goTo(activeIndex - 1);
                }}
              />
            )}
          </button>
        </div>

        {badgeCount > 0 && (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end pointer-events-none">
            {isRecommended && (
              <span className="inline-flex items-center rounded-full bg-primary-50/95 text-primary-700 border border-primary-100 text-[11px] font-semibold px-2.5 py-1 backdrop-blur-[2px]">
                ✨ موصى به لك
              </span>
            )}
            {hasActiveOffer && (
              <span className="inline-flex items-center rounded-full bg-gray-900/80 text-white text-[11px] font-semibold px-2.5 py-1 backdrop-blur-[2px]">
                🔥 عرض
              </span>
            )}
          </div>
        )}
        </div>

        {hasMultiple && (
          <div
            className="flex gap-2 mt-3 md:mt-0 md:flex-col md:w-20 lg:w-24 md:max-h-[28rem] md:overflow-y-auto overflow-x-auto scrollbar-hide pb-1 snap-x md:snap-y snap-mandatory px-0.5 shrink-0"
            role="tablist"
            aria-label="صور المنتج"
          >
            {galleryImages.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`الصورة ${i + 1} من ${totalImages}`}
                aria-current={i === activeIndex ? 'true' : undefined}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'relative shrink-0 snap-start w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 md:w-full md:h-16 lg:h-20 rounded-xl overflow-hidden',
                  'border bg-white transition-all touch-manipulation shadow-sm',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                  i === activeIndex
                    ? 'border-primary-500 ring-2 ring-primary-100 shadow-card scale-[1.02]'
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-card opacity-90 hover:opacity-100',
                )}
              >
                <div className="absolute inset-0 bg-slate-50/80" aria-hidden />
                {isAnimatedImageUrl(url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="absolute inset-0 w-full h-full object-contain p-1.5 z-[1]" />
                ) : (
                  <OptimizedImage
                    src={url}
                    alt=""
                    variant="thumbnail"
                    fill
                    className="object-contain p-1.5 relative z-[1]"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 motion-reduce:transition-none"
          role="dialog"
          aria-modal="true"
          aria-label={`معرض صور ${alt}`}
        >
          <button
            type="button"
            className="absolute top-4 left-4 min-w-11 min-h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setFullscreen(false)}
            aria-label="إغلاق"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full max-w-3xl aspect-square">
            {isAnimatedImageUrl(activeImage) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeImage} alt={alt} className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <OptimizedImage
                src={activeImage}
                alt={alt}
                variant="detail"
                fill
                className="object-contain"
              />
            )}
          </div>
          {hasMultiple && (
            <div className="mt-4 flex gap-2 max-w-full overflow-x-auto px-2 pb-2">
              {galleryImages.map((url, i) => (
                <button
                  key={`fs-${url}-${i}`}
                  type="button"
                  aria-label={`الصورة ${i + 1} من ${totalImages}`}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border bg-white/10',
                    i === activeIndex
                      ? 'border-white ring-2 ring-white/40 shadow-md scale-105'
                      : 'border-white/30 opacity-75 hover:opacity-100',
                  )}
                >
                {isAnimatedImageUrl(url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="absolute inset-0 w-full h-full object-contain p-1" />
                ) : (
                  <OptimizedImage src={url} alt="" variant="thumbnail" fill className="object-contain p-1" />
                )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
