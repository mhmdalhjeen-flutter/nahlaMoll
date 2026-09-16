'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Pencil, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import {
  getOfferKindLabel,
  getStockTypeLabel,
  parseProductTags,
} from '@/lib/product-meta';
import { getConditionLabel } from '@/lib/product-labels';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function ProductDetailsModal({ product, onClose, onDelete }: ProductDetailsModalProps) {
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [product, onClose]);

  if (!product) return null;

  const meta = parseProductTags(product.tags ?? []);
  const isAvailable = product.isAvailable && product.isActive;
  const variantGroups = groupVariants(product.variants ?? []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="إغلاق"
      />

      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl min-w-0">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3">
          <h2 className="font-bold text-lg">تفاصيل المنتج</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {product.images?.[0] && (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-100">
              <OptimizedImage
                src={product.images[0]}
                alt={product.name}
                variant="detail"
                fill
                className="object-cover"
                sizes="640px"
                priority
              />
            </div>
          )}

          {product.images && product.images.length > 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">صور إضافية</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.slice(1).map((url) => (
                  <div key={url} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-gray-200">
                    <OptimizedImage src={url} alt="" variant="thumbnail" fill className="object-cover" sizes="80px" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {meta.animatedImage && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">صورة متحركة</p>
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-gray-200">
                <OptimizedImage src={meta.animatedImage} alt="" variant="detail" fill className="object-cover" sizes="128px" />
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
            <p className="text-2xl font-bold text-primary-600 mt-1">{formatPrice(product.price)} ₪</p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <DetailItem label="التصنيف" value={product.category?.name ?? '—'} />
            <DetailItem label="وحدة القياس" value={meta.unit} />
            <DetailItem label="حالة المخزون" value={getStockTypeLabel(product.availability)} />
            <DetailItem label="حالة المنتج" value={getConditionLabel(product.condition)} />
            {product.availability === 'LIMITED' && (
              <DetailItem label="الكمية" value={String(product.stock)} />
            )}
            <DetailItem label="التوفر" value={isAvailable ? 'متوفر' : 'غير متوفر'} />
            <DetailItem
              label="مساهمة التوصيل"
              value={
                Number(product.freeDeliveryValue) > 0
                  ? `${Number(product.freeDeliveryValue)}%`
                  : '—'
              }
            />
            <DetailItem label="موصى به" value={product.isRecommended ? 'نعم' : 'لا'} />
            {product.hasOffer && (
              <>
                <DetailItem label="عرض" value="نعم" />
                <DetailItem label="نوع العرض" value={getOfferKindLabel(meta.offerKind)} />
                {meta.offerDetails && (
                  <div className="sm:col-span-2">
                    <DetailItem label="تفاصيل العرض" value={meta.offerDetails} />
                  </div>
                )}
              </>
            )}
          </dl>

          {variantGroups.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">المتغيرات</p>
              <div className="space-y-2">
                {variantGroups.map(([type, values]) => (
                  <div key={type} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">{type}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map((v) => (
                        <span
                          key={v}
                          className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-sm text-gray-800"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">الوصف</p>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2 sticky bottom-0 bg-white pb-2 border-t border-gray-100 mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:border-0">
            <Link href={`/products/${product.id}`} className="btn-primary flex-1 min-h-[48px] text-base">
              <Pencil className="w-4 h-4 ml-1.5" />
              تعديل
            </Link>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(product.id);
              }}
              className="btn-danger flex-1 min-h-[48px] text-base"
            >
              <Trash2 className="w-4 h-4 ml-1.5" />
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}

function groupVariants(variants: { name: string; value: string; type: string }[]): [string, string[]][] {
  const map = new Map<string, string[]>();
  for (const v of variants) {
    const type = v.type || 'عام';
    const val = v.value || v.name;
    if (!map.has(type)) map.set(type, []);
    const list = map.get(type)!;
    if (!list.includes(val)) list.push(val);
  }
  return Array.from(map.entries());
}
