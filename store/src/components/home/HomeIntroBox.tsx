'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import type { Category } from '@/lib/types';
import { BRAND, BRAND_ASSETS, HOME_COPY, LOGO_META } from '@/lib/branding';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-url';

const VISIBLE_CATEGORY_COUNT = 5;

interface HomeIntroBoxProps {
  categories: Category[];
  loading?: boolean;
}

export function HomeIntroBox({ categories, loading }: HomeIntroBoxProps) {
  const rootCategories = categories.filter((c) => !c.parentId);
  const visibleCategories = rootCategories.slice(0, VISIBLE_CATEGORY_COUNT);

  return (
    <section className="container mx-auto px-4 pt-3 pb-2 max-w-6xl">
      <div className="rounded-2xl border border-navy-100 bg-white shadow-card overflow-hidden">
        <div className="header-gold-accent" aria-hidden />

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col items-center text-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
            <div className="relative w-[88px] h-[69px] sm:w-[100px] sm:h-[78px]">
              <Image
                src={BRAND_ASSETS.logo}
                alt={BRAND.nameAr}
                fill
                priority
                className="object-contain object-center"
                sizes="100px"
                style={{ aspectRatio: LOGO_META.aspectRatio }}
              />
            </div>

            <div className="space-y-1 max-w-lg">
              <h1 className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight">
                {HOME_COPY.nameDisplay}
              </h1>
              <p className="text-sm sm:text-base font-semibold text-primary-700">
                {HOME_COPY.shortLine}
              </p>
              <p className="text-xs sm:text-sm text-navy-700/90 leading-relaxed">
                {HOME_COPY.positioning}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed pt-0.5">
                {HOME_COPY.promise}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <Link
              href="#home-feed"
              className="btn-primary min-h-[44px] px-5 text-sm font-semibold shadow-sm"
            >
              {HOME_COPY.ctaPrimary}
            </Link>
            <Link
              href="/categories/all"
              className="btn-outline min-h-[44px] px-5 text-sm font-semibold"
            >
              {HOME_COPY.ctaSecondary}
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1 border-t border-gray-100 pt-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[60px] space-y-1.5">
                  <div className="skeleton w-12 h-12 rounded-xl mx-auto" />
                  <div className="skeleton h-2.5 w-10 mx-auto rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1 border-t border-gray-100 pt-3"
              role="navigation"
              aria-label="تصفح الأقسام"
            >
              {visibleCategories.map((cat) => (
                <IntroCategoryChip
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  label={cat.name}
                  image={cat.image}
                />
              ))}
              <IntroCategoryChip
                href="/categories/all"
                label="المزيد"
                icon={<LayoutGrid className="w-4 h-4" aria-hidden />}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function IntroCategoryChip({
  href,
  label,
  image,
  icon,
}: {
  href: string;
  label: string;
  image?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'shrink-0 flex flex-col items-center gap-1 min-h-[44px] w-[60px]',
        'active:scale-[0.97] transition-transform duration-200',
      )}
    >
      <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-gray-100 bg-gray-50 hover:border-primary-300 transition-colors">
        {image ? (
          <Image
            src={getOptimizedImageUrl(image, 'thumbnail')}
            alt=""
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary-600 bg-primary-50">
            {icon ?? (
              <span className="text-sm font-bold text-primary-700">{label.charAt(0)}</span>
            )}
          </div>
        )}
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-navy-700 text-center line-clamp-2 leading-tight max-w-[60px]">
        {label}
      </span>
    </Link>
  );
}
