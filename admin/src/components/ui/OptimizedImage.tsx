'use client';

import Image from 'next/image';
import {
  getOptimizedImageUrl,
  isAnimatedImageUrl,
  type ImageVariant,
} from '@/lib/image-url';

interface OptimizedImageProps {
  src: string;
  alt: string;
  variant?: ImageVariant;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
}

/** Next.js Image for static formats; native img for GIF to preserve animation. */
export function OptimizedImage({
  src,
  alt,
  variant = 'original',
  fill,
  className = '',
  sizes,
  priority,
  onLoad,
}: OptimizedImageProps) {
  const displayUrl = getOptimizedImageUrl(src, variant);

  if (isAnimatedImageUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displayUrl}
        alt={alt}
        className={
          fill
            ? `absolute inset-0 w-full h-full object-cover ${className}`.trim()
            : className
        }
        onLoad={onLoad}
      />
    );
  }

  return (
    <Image
      src={displayUrl}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      priority={priority}
      onLoad={onLoad}
    />
  );
}
