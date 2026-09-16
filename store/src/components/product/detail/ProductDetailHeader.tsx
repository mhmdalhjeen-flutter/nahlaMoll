'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductDetailHeaderProps {
  isFavorite?: boolean;
  onToggleFavorite: () => void;
  favoriteLoading?: boolean;
}

export function ProductDetailHeader({
  isFavorite,
  onToggleFavorite,
  favoriteLoading,
}: ProductDetailHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-area-top">
      <div className="container mx-auto px-3 h-14 flex items-center justify-between max-w-6xl">
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(
            'min-w-11 min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl',
            'text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          )}
          aria-label="رجوع"
        >
          <ArrowRight className="w-5 h-5" aria-hidden />
          <span className="text-sm font-medium hidden sm:inline">رجوع</span>
        </button>

        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={favoriteLoading}
          aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          aria-pressed={isFavorite}
          className={cn(
            'min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl',
            'border border-gray-100 transition-colors touch-manipulation',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            isFavorite ? 'text-error-500 bg-error-50/50' : 'text-gray-600 hover:bg-gray-50',
          )}
        >
          <Heart className={cn('w-5 h-5', isFavorite && 'fill-current')} aria-hidden />
        </button>
      </div>
    </header>
  );
}
