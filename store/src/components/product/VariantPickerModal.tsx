'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { Product, ProductVariant } from '@/lib/types';
import { ProductPriceDisplay } from './ProductPriceDisplay';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-url';
import { isProductInStock } from '@/lib/free-delivery';

interface VariantPickerModalProps {
  open: boolean;
  product: Product | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (variant: ProductVariant) => void;
}

import { groupVariantsByType, getVariantLabel } from '@/lib/product-variants';

export function VariantPickerModal({
  open,
  product,
  loading,
  onClose,
  onConfirm,
}: VariantPickerModalProps) {
  const [selected, setSelected] = useState<ProductVariant | null>(null);

  const productId = product?.id;

  useEffect(() => {
    if (open && productId) {
      setSelected(null);
    }
  }, [open, productId]);

  const groups = useMemo(
    () => (product?.variants ? groupVariantsByType(product.variants) : new Map()),
    [product?.variants],
  );

  if (!product) return null;

  const variantAdjustment = selected
    ? parseFloat(String(selected.priceAdjustment ?? 0))
    : 0;

  return (
    <Modal open={open} onClose={onClose} title={product.name}>
      <div className="space-y-4">
        {product.images?.[0] && (
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
            <Image
              src={getOptimizedImageUrl(product.images[0], 'detail')}
              alt={product.name}
              fill
              className="object-cover"
              sizes="400px"
            />
          </div>
        )}

        <ProductPriceDisplay
          product={product}
          variantAdjustment={variantAdjustment}
          size="md"
        />

        {Array.from(groups.entries()).map(([type, variants]) => (
          <div key={type}>
            <p className="text-sm font-semibold text-gray-800 mb-2">{type}</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v: ProductVariant) => {
                const inStock = isProductInStock(
                  { availability: product.availability, stock: product.stock, variants: product.variants },
                  v,
                );
                return (
                <button
                  key={v.id}
                  type="button"
                  disabled={!inStock}
                  onClick={() => inStock && setSelected(v)}
                  className={cn(
                    'min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 active:scale-95',
                    !inStock && 'opacity-40 cursor-not-allowed line-through',
                    selected?.id === v.id
                      ? 'border-primary-600 bg-primary-50 text-primary-800 ring-2 ring-primary-100'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300',
                  )}
                >
                  {getVariantLabel(v)}
                </button>
              );})}
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1 min-h-[48px]" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            className="flex-1 min-h-[48px]"
            disabled={!selected || loading}
            loading={loading}
            onClick={() => selected && onConfirm(selected)}
          >
            إضافة
          </Button>
        </div>
      </div>
    </Modal>
  );
}
