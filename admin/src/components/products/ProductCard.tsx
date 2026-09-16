'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { Switch } from '@/components/ui/Switch';
import { getStockTypeLabel } from '@/lib/product-meta';
import { getConditionLabel, getProductStatusBadges } from '@/lib/product-labels';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface ProductCardProps {
  product: Product;
  onToggleAvailability: (product: Product, available: boolean) => void;
  onDelete: (id: string) => void;
  onOpenDetails: (product: Product) => void;
  toggling?: boolean;
}

const BADGE_STYLES = {
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  error: 'bg-error-100 text-error-700',
  info: 'bg-primary-100 text-primary-700',
  neutral: 'bg-gray-100 text-gray-600',
} as const;

export function ProductCard({
  product,
  onToggleAvailability,
  onDelete,
  onOpenDetails,
  toggling,
}: ProductCardProps) {
  const image = product.images?.[0];
  const isAvailable = product.isAvailable && product.isActive;
  const badges = getProductStatusBadges(product);
  const stockLabel = getStockTypeLabel(product.availability);
  const conditionLabel = getConditionLabel(product.condition);

  return (
    <article className="card p-0 overflow-hidden hover:shadow-lg transition-shadow duration-200 min-w-0">
      {/* Mobile: vertical single-column card */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => onOpenDetails(product)}
          className="relative w-full aspect-[5/3] max-h-44 bg-gray-100 overflow-hidden text-right block"
        >
          {image ? (
            <OptimizedImage
              src={image}
              alt={product.name}
              variant="card"
              fill
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              بدون صورة
            </div>
          )}
        </button>

        <div className="p-3 space-y-3 min-w-0">
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-bold ${BADGE_STYLES[b.tone]}`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}

          <button type="button" onClick={() => onOpenDetails(product)} className="text-right w-full min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-snug break-words">{product.name}</h3>
            <p className="text-primary-600 font-bold text-xl mt-1 ltr-input" dir="ltr">
              {formatPrice(product.price)} ₪
            </p>
          </button>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <MetaChip label="المخزون" value={stockLabel} />
            <MetaChip
              label="الكمية"
              value={product.availability === 'LIMITED' ? `${product.stock} متبقية` : '—'}
            />
            <MetaChip label="الحالة" value={conditionLabel} />
            <MetaChip label="التوفر" value={isAvailable ? 'متوفر' : 'غير متوفر'} />
          </dl>

          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
            <Switch
              label={isAvailable ? 'متوفر للبيع' : 'غير متوفر للبيع'}
              checked={isAvailable}
              disabled={toggling || !product.isActive}
              onChange={(checked) => onToggleAvailability(product, checked)}
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Link
              href={`/products/${product.id}`}
              className="btn-secondary w-full min-h-[48px] text-base"
              onClick={(e) => e.stopPropagation()}
            >
              <Pencil className="w-4 h-4 ml-2 shrink-0" />
              تعديل المنتج
            </Link>
            <button
              type="button"
              onClick={() => onDelete(product.id)}
              className="btn-danger w-full min-h-[48px] text-base"
            >
              <Trash2 className="w-4 h-4 ml-2 shrink-0" />
              حذف المنتج
            </button>
          </div>
        </div>
      </div>

      {/* Tablet / desktop: grid card */}
      <div className="hidden sm:flex flex-col h-full min-w-0">
        <button
          type="button"
          onClick={() => onOpenDetails(product)}
          className="relative aspect-[4/3] w-full bg-gray-100 overflow-hidden text-right"
        >
          {image ? (
            <OptimizedImage
              src={image}
              alt={product.name}
              variant="card"
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              بدون صورة
            </div>
          )}
          {product.isRecommended && (
            <span className="absolute top-3 right-3 rounded-lg bg-warning-500 px-2 py-0.5 text-[10px] font-bold text-white">
              موصى به
            </span>
          )}
          {product.hasOffer && (
            <span className="absolute top-3 left-3 rounded-lg bg-error-500 px-2 py-0.5 text-[10px] font-bold text-white">
              عرض
            </span>
          )}
        </button>

        <div className="p-4 flex flex-col flex-1 gap-3 min-w-0">
          <button type="button" onClick={() => onOpenDetails(product)} className="text-right min-w-0">
            <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug">{product.name}</h3>
            <p className="text-primary-600 font-bold text-lg mt-1 ltr-input" dir="ltr">
              {formatPrice(product.price)} ₪
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stockLabel}
              {product.availability === 'LIMITED' && ` · ${product.stock} متبقية`}
              {' · '}
              {conditionLabel}
            </p>
          </button>

          <div className="mt-auto pt-3 border-t border-gray-100 space-y-3">
            <Switch
              label={isAvailable ? 'متوفر' : 'غير متوفر'}
              checked={isAvailable}
              disabled={toggling || !product.isActive}
              onChange={(checked) => onToggleAvailability(product, checked)}
            />

            <div className="flex gap-2">
              <Link
                href={`/products/${product.id}`}
                className="btn-secondary flex-1 text-sm py-2.5 min-h-[44px]"
                onClick={(e) => e.stopPropagation()}
              >
                <Pencil className="w-4 h-4 ml-1.5" />
                تعديل
              </Link>
              <button
                type="button"
                onClick={() => onDelete(product.id)}
                className="btn-danger flex-1 text-sm py-2.5 min-h-[44px]"
              >
                <Trash2 className="w-4 h-4 ml-1.5" />
                حذف
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2.5 py-2 min-w-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 mt-0.5 truncate">{value}</dd>
    </div>
  );
}
